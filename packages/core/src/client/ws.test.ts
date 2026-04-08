import { describe, expect, it } from 'vitest';
import { createWSManager } from './ws';

interface MockWebSocket {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
}

class FakeClassList {
  private readonly values = new Set<string>();

  public constructor(initial: string[] = []) {
    for (const value of initial) {
      this.values.add(value);
    }
  }

  public add(value: string): void {
    this.values.add(value);
  }

  public contains(value: string): boolean {
    return this.values.has(value);
  }
}

class FakeElement {
  public readonly children: FakeElement[] = [];
  public readonly classList = new FakeClassList();
  public textContent = '';
  public id = '';
  public parent: FakeElement | null = null;
  private currentClassName = '';

  set className(value: string) {
    this.currentClassName = value;
    for (const cls of value.split(/\s+/).filter(Boolean)) {
      this.classList.add(cls);
    }
  }

  get className(): string {
    return this.currentClassName;
  }

  get childElementCount(): number {
    return this.children.length;
  }

  get firstElementChild(): FakeElement | null {
    return this.children[0] ?? null;
  }

  public appendChild(child: FakeElement): void {
    child.parent = this;
    this.children.push(child);
  }

  public remove(): void {
    if (!this.parent) {
      return;
    }
    this.parent.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = null;
  }

  public querySelector(selector: string): FakeElement | null {
    const classes = selector
      .split('.')
      .filter(Boolean);
    if (classes.length === 0) {
      return null;
    }
    const stack = [...this.children];
    while (stack.length > 0) {
      const current = stack.shift() as FakeElement;
      const allMatch = classes.every((cls) => current.classList.contains(cls));
      if (allMatch) {
        return current;
      }
      stack.push(...current.children);
    }
    return null;
  }
}

function setupDom(): {
  restore: () => void;
  document: {
    getElementById: (id: string) => FakeElement | null;
  };
} {
  const previousWindow = globalThis.window as unknown;
  const previousDocument = globalThis.document as unknown;

  const root = new FakeElement();
  root.id = 'lk-root';
  const toastRoot = new FakeElement();
  toastRoot.id = 'lk-toast-root';
  const byId = new Map<string, FakeElement>([
    ['lk-root', root],
    ['lk-toast-root', toastRoot],
  ]);
  const fakeDocument = {
    documentElement: { setAttribute: () => {} },
    addEventListener: () => {},
    getElementById: (id: string) => byId.get(id) ?? null,
    createElement: () => new FakeElement(),
  };
  const storage = new Map<string, string>();
  const fakeWindow = {
    location: { protocol: 'http:', host: '127.0.0.1:3500' },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    },
    setTimeout,
  };

  Object.assign(globalThis, {
    window: fakeWindow,
    document: fakeDocument,
  });
  return {
    document: fakeDocument,
    restore: () => {
      Object.assign(globalThis, {
        window: previousWindow,
        document: previousDocument,
      });
    },
  };
}

describe('client ws manager', () => {
  it('renders toast for TOAST messages (except connection id sentinel)', () => {
    const { document, restore } = setupDom();
    try {
      const sockets: MockWebSocket[] = [];
      const manager = createWSManager({
        wsFactory: (() => {
          const socket: MockWebSocket = {
            onopen: null,
            onmessage: null,
            onclose: null,
            send: () => {},
            close: () => {},
          };
          sockets.push(socket);
          return socket as unknown as WebSocket;
        }) as (url: string) => WebSocket,
      });

      manager.connect();
      const socketRef = sockets[0];
      expect(socketRef).toBeDefined();
      if (!socketRef) {
        throw new Error('mock socket was not created');
      }

      socketRef.onmessage?.({
        data: JSON.stringify({
          type: 'TOAST',
          payload: { message: 'hello toast', type: 'success', duration: 5000 },
        }),
      });

      const container = document.getElementById('lk-toast-root');
      expect(container).not.toBeNull();
      expect(container?.classList.contains('lk-toast-container')).toBe(true);
      const toast = container?.querySelector('.lk-toast.lk-toast--success');
      expect(toast?.textContent).toBe('hello toast');
    } finally {
      restore();
    }
  });
});
