import type { WritableAtom } from 'nanostores';
import type { ComponentHandle, ConnectionScope } from '../components/types';
import type { ClientEventPayload } from '../engine/messages';

export interface PluginLogger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
}

export interface RouteHandler {
  (request: Request): Response | Promise<Response>;
}

export interface PluginContext {
  registerComponent<T extends ComponentHandle<Record<string, unknown>, unknown>>(
    _name: string,
    _definition: unknown,
  ): void;
  registerRoute(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    handler: RouteHandler,
  ): void;
  registerMiddleware(_fn: (request: Request) => Response | Promise<Response> | void): void;
  getStore<T>(key: string, initialValue: T): WritableAtom<T>;
  onConnection(handler: (scope: ConnectionScope) => void): void;
  onDisconnect(handler: (scope: ConnectionScope) => void): void;
  onEvent(handler: (scope: ConnectionScope, event: ClientEventPayload) => boolean | void): void;
  config: Record<string, unknown>;
  logger: PluginLogger;
  getPlugin(name: string): Pick<LastrikoPlugin, 'name' | 'version'> | undefined;
}

export interface LastrikoPlugin {
  name: string;
  version: string;
  setup(ctx: PluginContext): void | Promise<void>;
  teardown?(): void | Promise<void>;
}
