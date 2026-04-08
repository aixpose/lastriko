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

function isDebugWs(): boolean {
  return typeof window !== 'undefined'
    && Boolean((window as Window & { __LK_DEBUG_WS__?: boolean }).__LK_DEBUG_WS__);
}

function sendMessage(ws: WSLike, message: ClientMessage): void {
  const raw = JSON.stringify(message);
  if (isDebugWs()) {
    console.debug('[lastriko] →', message.type, message);
  }
  ws.send(raw);
}

function getToastContainer(): HTMLElement | null {
  const root = document.getElementById('lk-toast-root');
  if (!root) {
    return null;
  }
  root.classList.add('lk-toast-container');
  return root;
}

function showToast(payload: {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}): void {
  const container = getToastContainer();
  if (!container) {
    return;
  }
  const toast = document.createElement('div');
  toast.className = `lk-toast lk-toast--${payload.type}`;
  toast.textContent = payload.message;
  container.appendChild(toast);

  while (container.childElementCount > 3) {
    container.firstElementChild?.remove();
  }

  const timeoutMs = payload.duration ?? 4000;
  const safeDuration = Number.isFinite(timeoutMs) ? Math.max(200, timeoutMs) : 4000;
  window.setTimeout(() => {
    toast.remove();
  }, safeDuration);
}

function applyTabsActiveState(root: ParentNode): void {
  const tabsRoots = Array.from(root.querySelectorAll<HTMLElement>('.lk-tabs[data-lk-id]'));
  for (const tabsRoot of tabsRoots) {
    const activeButton = tabsRoot.querySelector<HTMLButtonElement>('.lk-tab.is-active[data-lk-tab-target]');
    const fallbackButton = tabsRoot.querySelector<HTMLButtonElement>('.lk-tab[data-lk-tab-target]:not(:disabled)');
    const current = activeButton ?? fallbackButton;
    if (!current) {
      continue;
    }
    const activeLabel = current.dataset.lkTabTarget ?? '';
    for (const btn of Array.from(tabsRoot.querySelectorAll<HTMLButtonElement>('.lk-tab[data-lk-tab-target]'))) {
      const isActive = btn.dataset.lkTabTarget === activeLabel;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.tabIndex = isActive ? 0 : -1;
    }
    for (const panel of Array.from(tabsRoot.querySelectorAll<HTMLElement>('.lk-tab-panel[data-lk-tab-panel]'))) {
      const isActive = panel.dataset.lkTabPanel === activeLabel;
      if (isActive) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    }
  }
}

function initTabState(target?: Element | Document): void {
  if (target) {
    applyTabsActiveState(target);
    return;
  }
  applyTabsActiveState(document);
}

function syncShellDrawerButtons(root: ParentNode): void {
  const toggles = Array.from(root.querySelectorAll<HTMLInputElement>('.lk-shell-mobile-toggle'));
  for (const toggle of toggles) {
    const shell = toggle.closest<HTMLElement>('.lk-shell[data-lk-id]');
    if (!shell) {
      continue;
    }
    const shellId = shell.dataset.lkId ?? '';
    const controlsId = `lk-shell-sidebar-${shellId}`;
    const sidebar = shell.querySelector<HTMLElement>('.lk-shell-sidebar');
    if (sidebar && !sidebar.id) {
      sidebar.id = controlsId;
    }
    const labels = shell.querySelectorAll<HTMLLabelElement>(`label[for="${toggle.id}"].lk-shell-mobile-button`);
    for (const label of Array.from(labels)) {
      label.setAttribute('role', 'button');
      label.setAttribute('tabindex', '0');
      label.setAttribute('aria-controls', controlsId);
      label.setAttribute('aria-expanded', toggle.checked ? 'true' : 'false');
      label.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle.checked = !toggle.checked;
          label.setAttribute('aria-expanded', toggle.checked ? 'true' : 'false');
        }
      });
    }
    toggle.addEventListener('change', () => {
      for (const label of Array.from(labels)) {
        label.setAttribute('aria-expanded', toggle.checked ? 'true' : 'false');
      }
    });
  }
}

let keyboardA11yBound = false;
function setupKeyboardA11y(): void {
  if (keyboardA11yBound) {
    return;
  }
  keyboardA11yBound = true;
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    for (const toggle of Array.from(document.querySelectorAll<HTMLInputElement>('.lk-shell-mobile-toggle'))) {
      toggle.checked = false;
    }
  });
}

function applyClientTheme(mode: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', mode);
  window.localStorage.setItem('lk-theme', mode);
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

      if (isDebugWs()) {
        const preview = String(event.data).length > 500
          ? `${String(event.data).slice(0, 500)}…`
          : String(event.data);
        console.debug('[lastriko] ←', parsed.type, preview);
      }

      switch (parsed.type) {
        case 'RENDER':
          applyRender(parsed.payload);
          initTabState();
          syncShellDrawerButtons(document);
          setupKeyboardA11y();
          break;
        case 'FRAGMENT':
          applyFragmentSwap(parsed.payload.id, parsed.payload.html);
          initTabState();
          syncShellDrawerButtons(document);
          setupKeyboardA11y();
          break;
        case 'THEME':
          applyClientTheme(parsed.payload.mode);
          break;
        case 'TOAST':
          if (parsed.payload.message.startsWith('__connection_id__:')) {
            const connectionId = parsed.payload.message.slice('__connection_id__:'.length);
            window.localStorage.setItem('lk-connection-id', connectionId);
            break;
          }
          showToast(parsed.payload);
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
