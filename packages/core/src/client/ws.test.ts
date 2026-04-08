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

  public toggle(value: string, force?: boolean): void {
    if (force === true) {
      this.values.add(value);
      return;
    }
    if (force === false) {
      this.values.delete(value);
      return;
    }
    if (this.values.has(value)) {
      this.values.delete(value);
    }
    else {
      this.values.add(value);
    }
  }
}

class FakeElement {
  public readonly children: FakeElement[] = [];
  public readonly classList = new FakeClassList();
  public readonly dataset: Record<string, string> = {};
  public textContent = '';
  public hidden = false;
  public id = '';
  public parent: FakeElement | null = null;
  private currentClassName = '';
  private readonly attrs = new Map<string, string>();

  set className(value: string) {
    this.currentClassName = value;
    for (const cls of value.split(/\s+/).filter(Boolean)) {
      this.classList.add(cls);
    }
  }

  get className(): string {
    return this.currentClassName;
  }

  get parentElement(): FakeElement | null {
    return this.parent;
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
    const classes = (selector.match(/\.[\w-]+/g) ?? []).map((part) => part.slice(1));
    const attrMatchers = Array.from(selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g))
      .map((match) => ({ key: match[1], value: match[2] ?? null }));
    if (classes.length === 0 && attrMatchers.length === 0) {
      return null;
    }
    const stack = [...this.children];
    while (stack.length > 0) {
      const current = stack.shift() as FakeElement;
      const allClassesMatch = classes.every((cls) => current.classList.contains(cls));
      const allAttrsMatch = attrMatchers.every(({ key, value }) => {
        const got = current.getAttribute(key);
        if (value === null) {
          return got !== null;
        }
        return got === value;
      });
      const allMatch = allClassesMatch && allAttrsMatch;
      if (allMatch) {
        return current;
      }
      stack.push(...current.children);
    }
    return null;
  }

  public querySelectorAll(selector: string): FakeElement[] {
    const matches: FakeElement[] = [];
    const classes = (selector.match(/\.[\w-]+/g) ?? []).map((part) => part.slice(1));
    const attrMatchers = Array.from(selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g))
      .map((match) => ({ key: match[1], value: match[2] ?? null }));
    const stack = [...this.children];
    while (stack.length > 0) {
      const current = stack.shift() as FakeElement;
      const allClassesMatch = classes.every((cls) => current.classList.contains(cls));
      const allAttrsMatch = attrMatchers.every(({ key, value }) => {
        const got = current.getAttribute(key);
        if (value === null) {
          return got !== null;
        }
        return got === value;
      });
      if (allClassesMatch && allAttrsMatch) {
        matches.push(current);
      }
      stack.push(...current.children);
    }
    return matches;
  }

  public closest(selector: string): FakeElement | null {
    const isMatch = (node: FakeElement): boolean => {
      if (selector === '[data-lk-id]') {
        return node.getAttribute('data-lk-id') !== null;
      }
      if (selector === '.lk-tabs') {
        return node.classList.contains('lk-tabs');
      }
      if (selector === '.lk-shell[data-lk-id]') {
        return node.classList.contains('lk-shell') && node.getAttribute('data-lk-id') !== null;
      }
      const classes = (selector.match(/\.[\w-]+/g) ?? []).map((part) => part.slice(1));
      return classes.length > 0 && classes.every((cls) => node.classList.contains(cls));
    };

    const search = (node: FakeElement | null): FakeElement | null => {
      if (!node) {
        return null;
      }
      if (isMatch(node)) {
        return node;
      }
      return search(node.parent);
    };

    return search(this);
  }

  public setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
    if (name === 'class') {
      this.className = value;
    }
    if (name === 'id') {
      this.id = value;
    }
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      this.dataset[key] = value;
    }
    if (name === 'hidden') {
      this.hidden = true;
    }
  }

  public getAttribute(name: string): string | null {
    if (name === 'class') {
      return this.className;
    }
    if (name === 'id') {
      return this.id || null;
    }
    return this.attrs.get(name) ?? null;
  }

  public removeAttribute(name: string): void {
    this.attrs.delete(name);
    if (name === 'hidden') {
      this.hidden = false;
    }
  }

  public addEventListener(_type: string, _listener: (...args: unknown[]) => void): void {
    // no-op for unit tests
  }
}

function setupDom(): {
  restore: () => void;
  document: {
    querySelectorAll: (selector: string) => FakeElement[];
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
  const shell = new FakeElement();
  shell.className = 'lk-shell';
  shell.setAttribute('data-lk-id', 'shell-1');
  const toggle = new FakeElement();
  toggle.className = 'lk-shell-mobile-toggle';
  toggle.id = 'shell-1-drawer-toggle';
  const sidebar = new FakeElement();
  sidebar.className = 'lk-shell-sidebar';
  shell.appendChild(toggle);
  shell.appendChild(sidebar);
  root.appendChild(shell);
  const fakeDocument = {
    documentElement: { setAttribute: () => {} },
    addEventListener: () => {},
    querySelectorAll: (selector: string) => root.querySelectorAll(selector),
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

  it('applies tab state and shell drawer ids on render', () => {
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
      if (!socketRef) {
        throw new Error('mock socket was not created');
      }
      socketRef.onmessage?.({
        data: JSON.stringify({
          type: 'RENDER',
          payload: {
            title: 'tabs',
            theme: 'light',
            html: '<div class="lk-tabs" data-lk-id="tabs-1"><nav class="lk-tab-nav"><button class="lk-tab is-active" data-lk-tab-target="One">One</button><button class="lk-tab" data-lk-tab-target="Two">Two</button></nav><section class="lk-tab-panel" data-lk-tab-panel="One">A</section><section class="lk-tab-panel" data-lk-tab-panel="Two" hidden>B</section></div>',
          },
        }),
      });

      const sidebars = document.querySelectorAll('.lk-shell-sidebar');
      expect(sidebars.length).toBeGreaterThan(0);
      expect(sidebars[0]?.id).toBe('lk-shell-sidebar-shell-1');
    } finally {
      restore();
    }
  });
});
