import { Buffer } from 'node:buffer';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import {
  type IncomingMessage,
  type ServerResponse,
  createServer as createHttpServer,
} from 'node:http';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
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
  hotReloadPreserve?: boolean;
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
const DEFAULT_UPLOAD_MAX_SIZE = 10 * 1024 * 1024;

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

function parseBoundary(contentType: string | undefined): string | null {
  if (!contentType) {
    return null;
  }
  const match = /boundary=([^;]+)/i.exec(contentType);
  return match ? match[1].trim() : null;
}

function parseMultipartBody(buffer: Buffer, boundary: string): Array<{
  filename: string;
  contentType: string;
  content: Buffer;
}> {
  const marker = `--${boundary}`;
  const source = buffer.toString('binary');
  const segments = source.split(marker);
  const files: Array<{ filename: string; contentType: string; content: Buffer }> = [];
  for (const segment of segments) {
    const part = segment.trim();
    if (!part || part === '--') {
      continue;
    }
    const sepIdx = part.indexOf('\r\n\r\n');
    if (sepIdx < 0) {
      continue;
    }
    const rawHeaders = part.slice(0, sepIdx);
    const bodyBinary = part.slice(sepIdx + 4).replace(/\r\n--$/, '').replace(/\r\n$/, '');
    const filenameMatch = /filename="([^"]+)"/i.exec(rawHeaders);
    if (!filenameMatch) {
      continue;
    }
    const typeMatch = /content-type:\s*([^\r\n]+)/i.exec(rawHeaders);
    const filename = filenameMatch[1];
    const contentType = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';
    const content = Buffer.from(bodyBinary, 'binary');
    files.push({ filename, contentType, content });
  }
  return files;
}

function collectBody(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    let rejected = false;
    req.on('data', (chunk: Buffer) => {
      if (rejected) {
        return;
      }
      received += chunk.byteLength;
      if (received > maxBytes) {
        rejected = true;
        req.removeAllListeners('data');
        req.removeAllListeners('end');
        req.removeAllListeners('error');
        req.resume();
        reject(new Error('UPLOAD_TOO_LARGE'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
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
  uploadDirRoot: string;
  onUploadDirResolved?: (connectionId: string, uploadDir: string) => void;
}) {
  return async (
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

      if (pathname === '/upload' && req.method === 'POST') {
        const boundary = parseBoundary(req.headers['content-type']);
        if (!boundary) {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Missing multipart boundary' }));
          return;
        }
        const maxSizeFromHeader = req.headers['x-lastriko-upload-max-size'];
        const maxUploadBytes = typeof maxSizeFromHeader === 'string'
          ? Number(maxSizeFromHeader)
          : Number.NaN;
        const uploadMaxSize = Number.isFinite(maxUploadBytes) && maxUploadBytes > 0
          ? maxUploadBytes
          : DEFAULT_UPLOAD_MAX_SIZE;
        let body: Buffer;
        try {
          body = await collectBody(req, uploadMaxSize);
        }
        catch (err) {
          if (err instanceof Error && err.message === 'UPLOAD_TOO_LARGE') {
            res.statusCode = 413;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'File too large' }));
            return;
          }
          throw err;
        }
        const parts = parseMultipartBody(body, boundary);
        if (parts.length === 0) {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'No file part' }));
          return;
        }
        const scopeDirName = new URL(`http://localhost${req.url}`).searchParams.get('connectionId')
          ?? req.headers['x-lastriko-connection']
          ?? req.headers['x-lastriko-connection-id']
          ?? 'shared';
        const safeScopeDir = String(scopeDirName).replaceAll(/[^\w.-]/g, '_').slice(0, 120) || 'shared';
        const uploadDir = join(opts.uploadDirRoot, safeScopeDir);
        opts.onUploadDirResolved?.(safeScopeDir, uploadDir);
        mkdirSync(uploadDir, { recursive: true });
        const saved = parts.map((part, index) => {
          const name = `${Date.now()}-${index}-${part.filename}`;
          const path = join(uploadDir, name);
          writeFileSync(path, part.content);
          return {
            name: part.filename,
            path,
            size: part.content.byteLength,
            type: part.contentType,
          };
        });
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(saved.length === 1 ? saved[0] : saved));
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
  const uploadDirByConnectionId = new Map<string, string>();

  const server = createHttpServer(
    createHttpHandler({
      title: definition.title,
      toolbar: true,
      getTheme: () => config.theme ?? 'light',
      themeCssPath,
      clientRootPath,
      uploadDirRoot: join(tmpdir(), 'lastriko-uploads'),
      onUploadDirResolved: (connectionId, uploadDir) => {
        uploadDirByConnectionId.set(connectionId, uploadDir);
      },
    }),
  );
  const wsServer = new WebSocketServer({ noServer: true });

  wsServer.on('connection', (socket: WebSocket) => {
    const scope = wsHub.addConnection(socket);
    const pendingUploadDir = uploadDirByConnectionId.get(scope.id);
    if (pendingUploadDir) {
      scope.uploadDir = pendingUploadDir;
    }

    socket.on('message', (data: RawData) => {
      const normalized = normalizeIncomingWsData(data);
      if (normalized === null)
        return;
      wsHub.handleRawMessage(socket, normalized);
      const maybeCurrent = wsHub.getScopeById(scope.id);
      if (maybeCurrent?.uploadDir) {
        uploadDirByConnectionId.set(scope.id, maybeCurrent.uploadDir);
      }
    });

    socket.on('close', () => {
      uploadDirByConnectionId.delete(scope.id);
      wsHub.removeConnection(socket);
    });

    socket.on('error', () => {
      uploadDirByConnectionId.delete(scope.id);
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
