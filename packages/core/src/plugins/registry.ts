import { atom, type WritableAtom } from 'nanostores';
import type { LastrikoPlugin, PluginContext } from './types';
import type { ConnectionScope } from '../components/types';

export class PluginRegistry {
  private readonly plugins = new Map<string, LastrikoPlugin>();
  private readonly ordered: LastrikoPlugin[] = [];

  constructor(initial: LastrikoPlugin[] = []) {
    for (const plugin of initial) {
      this.register(plugin);
    }
  }

  register(plugin: LastrikoPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Duplicate plugin name: ${plugin.name}`);
    }
    this.plugins.set(plugin.name, plugin);
    this.ordered.push(plugin);
  }

  async setupAll(context?: PluginContext): Promise<void> {
    const ctx = context ?? createDefaultPluginContext(this);
    for (const plugin of this.ordered) {
      await plugin.setup(ctx);
    }
  }

  async teardownAll(): Promise<void> {
    for (const plugin of [...this.ordered].reverse()) {
      await plugin.teardown?.();
    }
  }

  getPlugin(name: string): Pick<LastrikoPlugin, 'name' | 'version'> | undefined {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return undefined;
    }
    return {
      name: plugin.name,
      version: plugin.version,
    };
  }
}

export function createPluginRegistry(initial: LastrikoPlugin[] = []): PluginRegistry {
  return new PluginRegistry(initial);
}

function createDefaultPluginContext(registry: PluginRegistry): PluginContext {
  return {
    registerComponent: () => {},
    registerRoute: () => {},
    registerMiddleware: () => {},
    getStore: <T>(_key: string, initialValue: T): WritableAtom<T> => atom(initialValue),
    onConnection: (_handler: (scope: ConnectionScope) => void) => {},
    onDisconnect: (_handler: (scope: ConnectionScope) => void) => {},
    onEvent: (_handler: (scope: ConnectionScope, event: { id: string; event: 'click' | 'change' | 'blur' | 'focus'; value?: unknown }) => boolean | void) => {},
    config: {},
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
    getPlugin: (name) => registry.getPlugin(name),
  };
}
