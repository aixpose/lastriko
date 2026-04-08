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

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(config.port ?? 3000, config.host ?? '127.0.0.1', () => resolveListen());
  });
  return {
    port: (config.port ?? 3000),
    host: config.host ?? '127.0.0.1',
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
