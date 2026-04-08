import type { ClientMessage, ServerMessage } from '../engine/messages';
import { applyFragmentSwap, applyRender, applyStreamChunk } from './swap';
import { bindEventDelegation, bindThemeToggle } from './events';

type WSLike = Pick<WebSocket, 'send' | 'close'>;

export interface WSManagerOptions {
  wsFactory?: (url: string) => WebSocket;
  url?: string;
  maxRetries?: number;
  initialDelayMs?: number;
}

export interface WSManager {
  connect(): void;
  disconnect(): void;
}

const DEFAULT_URL_PATH = '/ws';

function getDefaultWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${DEFAULT_URL_PATH}`;
}

function sendMessage(ws: WSLike, message: ClientMessage): void {
  ws.send(JSON.stringify(message));
}

export function createWSManager(opts: WSManagerOptions = {}): WSManager {
  const wsFactory = opts.wsFactory ?? ((url) => new WebSocket(url));
  const maxRetries = opts.maxRetries ?? Number.POSITIVE_INFINITY;
  const initialDelayMs = opts.initialDelayMs ?? 200;

  let ws: WebSocket | null = null;
  let attempts = 0;
  let shouldReconnect = true;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = (): void => {
    if (ws)
      return;
    const url = opts.url ?? getDefaultWsUrl();
    ws = wsFactory(url);

    ws.onopen = () => {
      attempts = 0;
      sendMessage(ws as WebSocket, {
        type: 'READY',
        payload: {
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          theme: (() => {
            const stored = window.localStorage.getItem('lk-theme');
            return stored === 'light' || stored === 'dark' ? stored : null;
          })(),
        },
      });

      bindEventDelegation(document, {
        send: (message) => sendMessage(ws as WebSocket, message),
      });
      bindThemeToggle(document, {
        send: (message) => sendMessage(ws as WebSocket, message),
      });
    };

    ws.onmessage = (event) => {
      let parsed: ServerMessage;
      try {
        parsed = JSON.parse(String(event.data)) as ServerMessage;
      } catch {
        return;
      }

      switch (parsed.type) {
        case 'RENDER':
          applyRender(parsed.payload);
          break;
        case 'FRAGMENT':
          applyFragmentSwap(parsed.payload.id, parsed.payload.html);
          break;
        case 'THEME':
          document.documentElement.setAttribute('data-theme', parsed.payload.mode);
          window.localStorage.setItem('lk-theme', parsed.payload.mode);
          break;
        case 'TOAST':
          if (parsed.payload.message.startsWith('__connection_id__:')) {
            const connectionId = parsed.payload.message.slice('__connection_id__:'.length);
            window.localStorage.setItem('lk-connection-id', connectionId);
            break;
          }
          // Minimal toast transport: visual UI not implemented yet.
          break;
        case 'STREAM_CHUNK':
          applyStreamChunk(
            parsed.payload.id,
            parsed.payload.chunk,
            parsed.payload.done,
            parsed.payload.format,
          );
          break;
        case 'STREAM_ERROR':
          console.error(parsed.payload.error);
          break;
        case 'ERROR':
          console.error(parsed.payload.message);
          break;
        default:
          break;
      }
    };

    ws.onclose = () => {
      ws = null;
      if (!shouldReconnect)
        return;
      if (attempts >= maxRetries)
        return;
      attempts += 1;
      const delay = Math.min(initialDelayMs * 2 ** (attempts - 1), 5000);
      reconnectTimer = setTimeout(() => connect(), delay);
    };
  };

  const disconnect = (): void => {
    shouldReconnect = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    ws?.close();
    ws = null;
  };

  return {
    connect,
    disconnect,
  };
}
