import process from 'node:process';
import type { LastrikoPlugin } from './plugins/types';
import { createServer, type RuntimeConfig, type RunningServer } from './engine/server';
import type { AppCallback } from './components/types';

export interface AppOptions {
  plugins?: LastrikoPlugin[];
  server?: RuntimeConfig;
}

export interface RunningApp {
  stop: () => Promise<void>;
  server: RunningServer;
}

export async function app(title: string, callback: AppCallback, opts: AppOptions = {}): Promise<RunningApp> {
  const plugins = opts.plugins as unknown as import('./plugins/registry').PluginRegistry | undefined;
  const server = await createServer({
    title,
    plugins,
    app: callback,
    ...(opts.server ?? {}),
  });
  if (process.env.NODE_ENV !== 'test') {
    console.info(`[lastriko] Ready at http://${server.host}:${server.port}`);
  }

  return {
    server,
    stop: async () => {
      await server.stop();
    },
  };
}

export type {
  ConnectionScope as Connection,
  ComponentHandle,
  ButtonHandle,
  ButtonCallbackHandle,
  TextHandle,
  UIContext,
  AppCallback,
} from './components/types';
export type { LastrikoPlugin } from './plugins/types';
export { createWebSocketHub } from './engine/websocket';
export { createWatcher, startWatcher } from './engine/watcher';
