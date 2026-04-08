import type { AppDefinition } from './executor';
import { executeApp, handleClientEvent } from './executor';
import type { ClientMessage, EventMessage, ReadyMessage, ThemeMode } from './messages';
import { parseClientMessage, serializeServerMessage } from './messages';
import { createConnectionScope } from '../components/registry';
import type { ConnectionScope } from '../components/types';

export interface WebSocketLike {
  send(data: string): void;
}

export interface SocketConnection {
  socket: WebSocketLike;
  scope: ConnectionScope;
}

export class WebSocketHub {
  private readonly connections = new Map<WebSocketLike, SocketConnection>();
  private readonly scopesById = new Map<string, ConnectionScope>();
  private currentTheme: ThemeMode = 'light';

  constructor(private readonly appDef: AppDefinition) {}

  addConnection(socket: WebSocketLike): ConnectionScope {
    const scope = createConnectionScope(undefined, {
      send: (message: Parameters<typeof serializeServerMessage>[0]) => this.send(socket, message),
    });
    this.send(socket, {
      type: 'TOAST',
      payload: {
        type: 'info',
        message: `__connection_id__:${scope.id}`,
        duration: 50,
      },
    });
    this.connections.set(socket, { socket, scope });
    this.scopesById.set(scope.id, scope);
    return scope;
  }

  removeConnection(socket: WebSocketLike): void {
    const entry = this.connections.get(socket);
    if (!entry) {
      return;
    }
    this.scopesById.delete(entry.scope.id);
    entry.scope.destroy();
    this.connections.delete(socket);
  }

  getScopeById(scopeId: string): ConnectionScope | undefined {
    return this.scopesById.get(scopeId);
  }

  handleRawMessage(socket: WebSocketLike, raw: unknown): void {
    const parsed = parseClientMessage(raw);
    if (!parsed) {
      return;
    }
    this.handleMessage(socket, parsed);
  }

  handleHotReload(): void {
    for (const { socket, scope } of this.connections.values()) {
      this.send(socket, {
        type: 'TOAST',
        payload: { message: 'Reloading...', type: 'info', duration: 1200 },
      });
      scope.clearTransientState();
      const result = executeApp(this.appDef, scope, this.currentTheme);
      if (!result.ok) {
        this.send(socket, {
          type: 'ERROR',
          payload: { message: result.error.message, stack: result.error.stack },
        });
      }
    }
  }

  private handleMessage(socket: WebSocketLike, message: ClientMessage): void {
    const entry = this.connections.get(socket);
    if (!entry) {
      return;
    }

    switch (message.type) {
      case 'READY':
        this.handleReady(entry, message);
        break;
      case 'EVENT':
        this.handleEvent(entry, message);
        break;
      case 'THEME_CHANGE':
        this.currentTheme = message.payload.mode;
        entry.scope.theme = this.currentTheme;
        this.send(socket, { type: 'THEME', payload: { mode: this.currentTheme } });
        break;
      case 'RESIZE':
        entry.scope.viewport = {
          width: message.payload.width,
          height: message.payload.height,
        };
        break;
    }
  }

  private handleReady(entry: SocketConnection, message: ReadyMessage): void {
    this.currentTheme = message.payload.theme ?? this.currentTheme;
    entry.scope.theme = this.currentTheme;
    entry.scope.viewport = {
      width: message.payload.viewport.width,
      height: message.payload.viewport.height,
    };
    const result = executeApp(this.appDef, entry.scope, this.currentTheme);
    if (!result.ok) {
      this.send(entry.socket, {
        type: 'ERROR',
        payload: { message: result.error.message, stack: result.error.stack },
      });
    }
  }

  private handleEvent(entry: SocketConnection, message: EventMessage): void {
    const { scope } = entry;
    try {
      handleClientEvent(scope, message.payload);
    } catch (error: unknown) {
      this.send(entry.socket, {
        type: 'TOAST',
        payload: {
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  private send(socket: WebSocketLike, message: Parameters<typeof serializeServerMessage>[0]): void {
    socket.send(serializeServerMessage(message));
  }
}

export function createWebSocketHub(appDef: AppDefinition): WebSocketHub {
  return new WebSocketHub(appDef);
}
