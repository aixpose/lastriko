import { readFileSync } from 'node:fs';
import {
  type IncomingMessage,
  type ServerResponse,
  createServer as createHttpServer,
} from 'node:http';
import { resolve } from 'node:path';
import process from 'node:process';
import { createHtmlShell } from './shell';
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

const cssPath = resolve(process.cwd(), 'packages/core/src/theme/lastriko.css');

const DEFAULT_PORT = 3000;
/** Max extra ports to try after the first (inclusive of first = maxAttempts tries). */
const PORT_HOP_MAX_ATTEMPTS = 64;

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
  onRoot?: () => void;
  getTheme: () => 'light' | 'dark';
  toolbar: boolean;
}) {
  return (
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>,
  ) => {
    if (!req.url) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    if (req.url === '/') {
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

    if (req.url === '/style.css') {
      res.statusCode = 200;
      res.setHeader('content-type', 'text/css; charset=utf-8');
      res.end(readFileSync(cssPath, 'utf8'));
      return;
    }

    if (req.url === '/client.js') {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/javascript; charset=utf-8');
      res.end('// Phase 1 client bundle should be built separately.');
      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  };
}

export async function startServer(
  definition: { title: string; callback: AppCallback; plugins?: PluginRegistry | AppCallback[] },
  config: RuntimeConfig = {},
): Promise<RunningServer> {
  const transport: Transport = { send: () => {} };
  void transport;
  void definition.callback;

  const server = createHttpServer(
    createHttpHandler({
      title: definition.title,
      toolbar: true,
      getTheme: () => config.theme ?? 'light',
    }),
  );

  const host = config.host ?? '127.0.0.1';
  const boundPort = await listenWithPortHop(server, config.port ?? DEFAULT_PORT, host);
  return {
    port: boundPort,
    host,
    server,
    stop: async () => {
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
