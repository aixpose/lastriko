import { existsSync, readFileSync } from 'node:fs';
import {
  type IncomingMessage,
  type ServerResponse,
  createServer as createHttpServer,
} from 'node:http';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import { createHtmlShell } from './shell';
import { resolveThemeCssPath } from './theme-path';
import { createWebSocketHub } from './websocket';
import type { AppCallback } from '../components/types';
import type { ThemeMode, Transport } from './messages';
import type { PluginRegistry } from '../plugins/registry';

export interface ServerOptions {
  title: string;
  app: AppCallback;
  plugins?: PluginRegistry;
  port?: number;
  host?: string;
  theme?: ThemeMode;
}

export interface RuntimeConfig {
  port?: number;
  host?: string;
  theme?: ThemeMode;
}

export interface RunningServer {
  port: number;
  host: string;
  server: ReturnType<typeof createHttpServer>;
  stop: () => Promise<void>;
}

const DEFAULT_PORT = 3500;
/** Max extra ports to try after the first (inclusive of first = maxAttempts tries). */
const PORT_HOP_MAX_ATTEMPTS = 64;

function resolveClientRootPath(cwd: string): string | null {
  const monorepoDist = join(cwd, 'packages/core/dist/client');
  if (existsSync(monorepoDist))
    return monorepoDist;

  const here = dirname(fileURLToPath(import.meta.url));
  const packageDist = join(here, '../client');
  if (existsSync(packageDist))
    return packageDist;

  return null;
}

function resolveClientModulePath(clientRootPath: string, requestUrl: string): string | null {
  const normalizedUrl = requestUrl === '/client.js'
    ? '/client/index.js'
    : requestUrl;

  if (!normalizedUrl.startsWith('/client/')) {
    return null;
  }

  const rel = normalizedUrl.slice('/client/'.length);
  if (!rel || rel.includes('..')) {
    return null;
  }

  const normalized = rel.endsWith('.js') ? rel : `${rel}.js`;
  const abs = join(clientRootPath, normalized);
  return existsSync(abs) ? abs : null;
}

function normalizeIncomingWsData(data: RawData): string | null {
  if (typeof data === 'string')
    return data;
  if (data instanceof ArrayBuffer)
    return Buffer.from(data).toString('utf8');
  if (Array.isArray(data))
    return Buffer.concat(data).toString('utf8');
  if (Buffer.isBuffer(data))
    return data.toString('utf8');
  return null;
}

function rewriteClientEntryImports(source: string): string {
  return source
    .replaceAll('from \'./', 'from \'/client/')
    .replaceAll('from "./', 'from "/client/')
    .replaceAll('import \'./', 'import \'/client/')
    .replaceAll('import "./', 'import "/client/');
}

async function listenWithPortHop(
  server: ReturnType<typeof createHttpServer>,
  initialPort: number,
  host: string,
): Promise<number> {
  if (initialPort === 0) {
    await new Promise<void>((resolveListen, rejectListen) => {
      const onError = (err: NodeJS.ErrnoException) => {
        server.off('error', onError);
        rejectListen(err);
      };
      server.once('error', onError);
      server.listen(0, host, () => {
        server.off('error', onError);
        resolveListen();
      });
    });
    const addr = server.address();
    if (addr && typeof addr === 'object')
      return addr.port;
    throw new Error('Could not determine ephemeral listen port');
  }

  const start = Math.max(1, Math.min(initialPort, 65535));
  const end = Math.min(start + PORT_HOP_MAX_ATTEMPTS - 1, 65535);

  async function tryPort(port: number): Promise<number> {
    await new Promise<void>((resolveListen, rejectListen) => {
      const onError = (err: NodeJS.ErrnoException) => {
        server.off('error', onError);
        rejectListen(err);
      };
      server.once('error', onError);
      server.listen(port, host, () => {
        server.off('error', onError);
        resolveListen();
      });
    });
    return port;
  }

  return await (async function hop(from: number): Promise<number> {
    try {
      return await tryPort(from);
    }
    catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'EADDRINUSE' || from >= end) {
        throw err;
      }
      if (from < end && process.env.NODE_ENV !== 'test') {
        console.error(
          `[lastriko] Port ${from} is in use, trying ${from + 1}…`,
        );
      }
      return hop(from + 1);
    }
  })(start);
}

function createHttpHandler(opts: {
  title: string;
  clientPath?: string;
  clientRootPath: string | null;
  onRoot?: () => void;
  getTheme: () => 'light' | 'dark';
  toolbar: boolean;
  themeCssPath: string | null;
}) {
  return (
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>,
  ) => {
    try {
      if (!req.url) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      const pathname = req.url.split('?')[0];

      if (pathname === '/') {
        opts.onRoot?.();
        const html = createHtmlShell({
          title: opts.title,
          initialTheme: opts.getTheme(),
          includeToolbar: opts.toolbar,
          bodyHtml: '',
          clientScriptPath: opts.clientPath ?? '/client.js',
        });
        res.statusCode = 200;
        res.setHeader('content-type', 'text/html; charset=utf-8');
        res.end(html);
        return;
      }

      if (pathname === '/style.css') {
        const cssPath = opts.themeCssPath;
        if (!cssPath) {
          res.statusCode = 500;
          res.setHeader('content-type', 'text/plain; charset=utf-8');
          res.end(
            'Lastriko theme CSS not found. Set LASTRIKO_THEME_CSS to an existing file, or install a published lastriko package with dist/theme/lastriko.css.',
          );
          return;
        }
        try {
          const css = readFileSync(cssPath, 'utf8');
          res.statusCode = 200;
          res.setHeader('content-type', 'text/css; charset=utf-8');
          res.end(css);
        }
        catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          res.statusCode = 500;
          res.setHeader('content-type', 'text/plain; charset=utf-8');
          res.end(`Failed to read theme CSS: ${msg}`);
        }
        return;
      }

      if (pathname === '/client.js' || pathname.startsWith('/client/')) {
        const clientRootPath = opts.clientRootPath;
        if (!clientRootPath) {
          res.statusCode = 500;
          res.setHeader('content-type', 'text/plain; charset=utf-8');
          res.end(
            'Lastriko client bundle not found. Build packages/core so dist/client exists.',
          );
          return;
        }

        if (pathname === '/client.js') {
          const entryPath = resolveClientModulePath(clientRootPath, '/client/index.js');
          if (!entryPath) {
            res.statusCode = 500;
            res.setHeader('content-type', 'text/plain; charset=utf-8');
            res.end(
              'Lastriko client entry not found at dist/client/index.js.',
            );
            return;
          }
          try {
            const entryJs = readFileSync(entryPath, 'utf8');
            const rewritten = rewriteClientEntryImports(entryJs);
            res.statusCode = 200;
            res.setHeader('content-type', 'application/javascript; charset=utf-8');
            res.end(rewritten);
          }
          catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            res.statusCode = 500;
            res.setHeader('content-type', 'text/plain; charset=utf-8');
            res.end(`Failed to read client entry bundle: ${msg}`);
          }
          return;
        }

        const modulePath = resolveClientModulePath(clientRootPath, pathname);
        if (!modulePath) {
          res.statusCode = 404;
          res.setHeader('content-type', 'text/plain; charset=utf-8');
          res.end('Not Found');
          return;
        }

        try {
          const js = readFileSync(modulePath, 'utf8');
          res.statusCode = 200;
          res.setHeader('content-type', 'application/javascript; charset=utf-8');
          res.end(js);
        }
        catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          res.statusCode = 500;
          res.setHeader('content-type', 'text/plain; charset=utf-8');
          res.end(`Failed to read client bundle: ${msg}`);
        }
        return;
      }

      res.statusCode = 404;
      res.end('Not Found');
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('content-type', 'text/plain; charset=utf-8');
        res.end(`Internal Server Error: ${msg}`);
      }
      else {
        res.destroy();
      }
    }
  };
}

export async function startServer(
  definition: { title: string; callback: AppCallback; plugins?: PluginRegistry | AppCallback[] },
  config: RuntimeConfig = {},
): Promise<RunningServer> {
  const transport: Transport = { send: () => {} };
  void transport;
  void definition.callback;

  const themeCssPath = resolveThemeCssPath(process.cwd());
  const clientRootPath = resolveClientRootPath(process.cwd());
  const wsHub = createWebSocketHub({
    title: definition.title,
    callback: definition.callback,
  });

  const server = createHttpServer(
    createHttpHandler({
      title: definition.title,
      toolbar: true,
      getTheme: () => config.theme ?? 'light',
      themeCssPath,
      clientRootPath,
    }),
  );
  const wsServer = new WebSocketServer({ noServer: true });

  wsServer.on('connection', (socket: WebSocket) => {
    wsHub.addConnection(socket);

    socket.on('message', (data: RawData) => {
      const normalized = normalizeIncomingWsData(data);
      if (normalized === null)
        return;
      wsHub.handleRawMessage(socket, normalized);
    });

    socket.on('close', () => {
      wsHub.removeConnection(socket);
    });

    socket.on('error', () => {
      wsHub.removeConnection(socket);
    });
  });

  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/ws') {
      socket.destroy();
      return;
    }
    wsServer.handleUpgrade(req, socket, head, (client: WebSocket) => {
      wsServer.emit('connection', client, req);
    });
  });

  const host = config.host ?? '127.0.0.1';
  const boundPort = await listenWithPortHop(server, config.port ?? DEFAULT_PORT, host);
  return {
    port: boundPort,
    host,
    server,
    stop: async () => {
      await new Promise<void>((resolveClose, rejectClose) => {
        for (const client of wsServer.clients) {
          client.close();
        }
        wsServer.close((err?: Error) => {
          if (err)
            rejectClose(err);
          else resolveClose();
        });
      });
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((err) => {
          if (err)
            rejectClose(err);
          else resolveClose();
        });
      });
    },
  };
}

export const __internal = {
  createHttpHandler,
};

export async function createServer(options: ServerOptions): Promise<RunningServer> {
  if (options.plugins) {
    await options.plugins.setupAll();
  }

  const running = await startServer(
    {
      title: options.title,
      callback: options.app,
      plugins: options.plugins,
    },
    {
      port: options.port,
      host: options.host,
      theme: options.theme,
    },
  );

  return {
    ...running,
    stop: async () => {
      if (options.plugins) {
        await options.plugins.teardownAll();
      }
      await running.stop();
    },
  };
}
