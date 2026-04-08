# Plugin System Architecture

> **Back to:** [MANIFEST.md](../../MANIFEST.md#6-plugin-system)
> **Phase:** 1 (interfaces), 4 (full implementation)

---

## Overview

The plugin system is the primary extension mechanism for Lastriko. The core package stays minimal; everything beyond basic UI primitives — LLM connectors, media processors, export targets, and auth — lives in plugins.

---

## Design Goals

1. **Zero cost when not used** — Plugins that are not registered add no overhead to startup or runtime.
2. **Type-safe by default** — Plugin APIs extend the `UIContext` type so TypeScript knows what's available.
3. **Isolated state** — Each plugin's state is scoped to a WebSocket connection (same model as core).
4. **Clean lifecycle** — `setup()` and `teardown()` have clear, predictable execution order.
5. **No monkey-patching** — Plugins use explicit registration APIs, never mutate global objects.
6. **No plugin-to-plugin dependencies** — See isolation rule below.

## Plugin Isolation Rule

This is a hard constraint with no exceptions:

```
Allowed:    plugin → core (lastriko)
NOT allowed: plugin → plugin
```

A plugin package must never `import` from another plugin package. If two plugins need shared behaviour, that behaviour is added to core's `PluginContext` API.

**Why this matters:**
- Eliminates circular dependency risks entirely
- No version conflicts when plugin A requires plugin B at version X but plugin C requires it at version Y
- Load order is always deterministic — only core → plugin, never plugin → plugin
- Developers can use any subset of plugins without triggering transitive dependencies
- Each plugin can be updated independently without breaking others

**What plugins CAN do via `PluginContext`:**
- Read other registered plugin metadata (name/version only): `ctx.getPlugin('openai')?.version`
- Use per-connection state stores: `ctx.getStore('key', defaultValue)`
- Register components, routes, and middleware
- Everything they need to operate independently

---

## Plugin Interface

```typescript
interface LastrikoPlugin {
  name: string;            // Unique identifier, e.g. 'openai'
  version: string;         // Semver string, e.g. '1.0.0'
  
  setup(ctx: PluginContext): void | Promise<void>;
  teardown?(): void | Promise<void>;
}
```

### `PluginContext` Interface

```typescript
interface PluginContext {
  // Register a new component type accessible via UIContext
  registerComponent<T extends ComponentHandle<any>>(
    name: string,
    definition: ComponentDefinition<T>
  ): void;
  
  // Register a new HTTP route on the server
  registerRoute(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    handler: RouteHandler
  ): void;
  
  // Register middleware for all HTTP requests
  registerMiddleware(fn: Middleware): void;
  
  // Get or create a Nanostores atom scoped to a connection
  // Called inside onConnection() to get per-connection state
  // Get or create a per-connection Nanostores atom scoped to this plugin
  // Call inside onConnection() to get per-connection state
  getStore<T>(key: string, initialValue: T): WritableAtom<T>;
  
  // Register a connection lifecycle handler
  onConnection(handler: (conn: Connection) => void): void;
  onDisconnect(handler: (conn: Connection) => void): void;
  
  // Register a raw WebSocket event handler (before normal processing)
  onEvent(handler: (conn: Connection, event: ClientEvent) => boolean | void): void;
  // Return true to stop normal event processing (consume the event)
  
  // Plugin's own configuration (passed at instantiation)
  config: Record<string, any>;
  
  // Structured logger for this plugin
  logger: {
    info(msg: string, data?: object): void;
    warn(msg: string, data?: object): void;
    error(msg: string, data?: object): void;
    debug(msg: string, data?: object): void;
  };
  
  // Access other registered plugins (for plugin-to-plugin communication)
  // Read-only access to another plugin's metadata (name, version)
  // Plugins MUST NOT import from each other — this is metadata only, not a call bridge
  getPlugin(name: string): Pick<LastrikoPlugin, 'name' | 'version'> | undefined;
}
```

---

## Component Registration

Plugins can add new component types to the `UIContext`:

```typescript
// Inside plugin setup()
ctx.registerComponent('chatUI', {
  // The server-side factory — returns a ComponentHandle
  create(ui: UIContext, opts?: ChatUIOptions): ChatUIComponent {
    const id = ui.generateId('chatUI');
    const historyAtom = ctx.getStore<Message[]>('history-' + id, []);
    
    return {
      id,
      type: 'chatUI',
      props: { model: opts?.model, ... },
      get value() { return historyAtom.get(); },
      // Chat-specific methods
      addMessage(role, content) {
        historyAtom.set([...historyAtom.get(), { role, content }]);
      },
    };
  },
  
  // Client-side renderer — returns HTML string or DOM mutation instructions
  // (This is how the client knows how to render this custom component type)
  clientRenderer: 'chatUI',  // References a pre-bundled client renderer
});
```

After this registration, the plugin adds `chatUI` to `UIContext` so TypeScript knows about it:

```typescript
// Type augmentation (in the plugin package's type definition)
declare module 'lastriko' {
  interface UIContext {
    chatUI(opts?: ChatUIOptions): ChatUIComponent;
  }
}
```

This is the standard TypeScript module augmentation pattern and is fully type-safe.

---

## Plugin Lifecycle

### Startup Order

```
1. Core engine bootstrap
2. For each plugin in config.plugins:
   a. Instantiate plugin (call the factory function, e.g. openai({ apiKey: '...' }))
   b. Call plugin.setup(ctx)
   c. Plugin registers components, routes, middleware
3. Start HTTP server (routes are now registered)
4. Start WebSocket server
5. Begin accepting connections
```

### Connection Order

```
New WebSocket connection received
       ↓
For each plugin (in registration order):
  → plugin.onConnection handler called with new Connection
       ↓
Core: create UIContext for connection
       ↓
Execute render function
       ↓
Send RENDER to client
```

### Event Order

```
CLIENT EVENT received
       ↓
For each plugin that registered onEvent handlers:
  → handler(conn, event) called in order
  → If handler returns true: event consumed, stop processing
       ↓
Core: update atom, schedule re-render
```

### Shutdown Order

```
SIGINT/SIGTERM received
       ↓
Stop accepting new connections
       ↓
For each plugin (in REVERSE registration order):
  → plugin.teardown() called
       ↓
Close all WebSocket connections
       ↓
Close HTTP server
       ↓
Exit
```

---

## Plugin Configuration Pattern

Plugins use a factory function pattern to allow configuration:

```typescript
// Plugin factory (what gets exported from the plugin package)
export function openai(config: OpenAIConfig): LastrikoPlugin {
  return {
    name: 'openai',
    version: '1.0.0',
    
    setup(ctx: PluginContext) {
      // config is captured in closure — no global state
      const client = new OpenAI({ apiKey: config.apiKey });
      
      ctx.registerComponent('chatUI', createChatUIDefinition(client, config));
      // ...
    },
  };
}
```

Usage:
```typescript
app('Demo', {
  plugins: [
    openai({ apiKey: process.env.OPENAI_API_KEY }),
  ],
}, (ui) => { ... });
```

---

## Security Constraints

| Rule | Enforcement |
|------|------------|
| API keys are NEVER serialized into component trees | Audit in CI: scan `RENDER`/`FRAGMENT`/`STREAM_CHUNK` messages for known key patterns |
| Plugin routes cannot override core routes (`/`, `/ws`, `/client.js`) | Validated in `registerRoute()` — throws if path is reserved |
| Plugin middleware cannot modify WebSocket upgrade responses | Middleware only applies to HTTP requests, not WS upgrades |
| Plugin `getStore()` keys are namespaced by plugin name | `ctx.getStore('key')` → stored as `'openai/key'` internally |

---

## Plugin Development Guide

> Full guide: `docs/plugin-development-guide.md` (to be created in Phase 4)

### Minimal Plugin Example

```typescript
// packages/plugin-hello/src/index.ts
import type { LastrikoPlugin, PluginContext } from 'lastriko';

export function helloPlugin(config: { message: string }): LastrikoPlugin {
  return {
    name: 'hello',
    version: '1.0.0',
    
    setup(ctx: PluginContext) {
      ctx.logger.info('Hello plugin loaded', { message: config.message });
      
      // Add a new route: GET /hello → returns the message
      ctx.registerRoute('GET', '/hello', (req) => {
        return new Response(config.message, { status: 200 });
      });
    },
    
    teardown() {
      ctx.logger.info('Hello plugin unloaded');
    },
  };
}
```

### Plugin Package Structure

```
packages/plugin-hello/
├── src/
│   ├── index.ts          # Plugin factory (public entry)
│   ├── component.ts      # Component definitions (if any)
│   └── client.ts         # Client-side renderer (if any)
├── package.json          # { name: '@lastriko/plugin-hello', ... }
├── tsconfig.json         # Extends root tsconfig.base.json
└── README.md
```

---

## Plugin Registry

The plugin registry is a simple in-memory store:

```typescript
class PluginRegistry {
  private plugins: Map<string, RegisteredPlugin> = new Map();
  
  register(plugin: LastrikoPlugin, config: object): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }
    this.plugins.set(plugin.name, { plugin, config });
  }
  
  getAll(): RegisteredPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  get(name: string): RegisteredPlugin | undefined {
    return this.plugins.get(name);
  }
}
```

---

## Known Limitations (Phase 1–3)

These limitations exist in the initial implementation and are addressed in Phase 4:

1. **`getPlugin()` is metadata-only** — returns `{ name, version }` of another registered plugin. It is NOT a way to call another plugin's methods. Code must never do `ctx.getPlugin('openai').doSomething()`. That would violate the isolation rule. `getPlugin()` exists only to let a plugin check whether an optional companion plugin is present.
2. **No client-side plugin code** — Custom component renderers must use built-in renderer primitives. Full custom client renderers come in Phase 4.
3. **No hot-reload for plugins** — If a plugin's source changes, the server must be restarted. (Developer scripts hot-reload; plugins do not.)
4. **Single plugin instance** — You cannot register the same plugin twice (e.g., two OpenAI instances with different API keys). This constraint may be relaxed in Phase 4.

---

*Related docs: [ENGINE.md](ENGINE.md) | [STATE.md](STATE.md)*
