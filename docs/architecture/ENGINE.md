# Core Engine — Architecture Specification

> **Back to:** [MANIFEST.md](../../MANIFEST.md#3-core-engine-specification)
> **Phase:** 1 (implementation), refined through all phases
> **Last updated:** 2026-04-07 — rewritten for app()-once + handle-based model

---

## Overview

The Lastriko Core Engine is the server-side runtime that:
1. Serves the initial HTML shell to the browser
2. Calls `app()` once per WebSocket connection to build the component tree
3. Renders components to HTML and sends them as targeted fragments
4. Dispatches button click events to bound handlers
5. Manages connection scopes (isolated per connection)
6. In dev mode: watches files and hot-reloads

---

## File Structure

```
packages/core/src/engine/
├── server.ts          # HTTP server (Bun.serve / Node http)
├── websocket.ts       # WebSocket server and connection management
├── lifecycle.ts       # App lifecycle state machine
├── watcher.ts         # File watcher — dev mode only
├── executor.ts        # app() invocation, scope management
├── renderer.ts        # Component → HTML string rendering
├── index.ts           # Engine barrel export
```

---

## App Lifecycle

```
         ┌──────────────────────────────┐
         │                              │
    ┌────▼────┐                    ┌────┴────┐
    │BOOTSTRAP│                    │SHUTDOWN │
    └────┬────┘                    └────▲────┘
         │                              │
    ┌────▼────┐                    ┌────┴─────┐
    │ SERVER  │                    │ STOPPING │
    │  START  │                    └────▲─────┘
    └────┬────┘                         │
         │                         SIGINT/SIGTERM
    ┌────▼────────┐                     │
    │  WAITING    │                     │
    │ (listening) │                     │
    └────┬────────┘                     │
         │ new WS connection             │
    ┌────▼──────────────┐               │
    │  CONNECTION SCOPE  │──────────────┘
    │  (per connection)  │  disconnect
    └────────────────────┘
```

### Stage 1: Bootstrap

```typescript
async function bootstrap(config: LastrikoConfig): Promise<void> {
  // 1. Parse CLI args (--port, --host, --dev, script path)
  // 2. Load lastriko.config.ts if present; merge with CLI args (CLI wins)
  // 3. Initialize plugin registry
  // 4. Call setup() on all registered plugins
  // 5. Proceed to Server Start
}
```

**Config resolution order (highest priority first):**
1. CLI flags
2. `lastriko.config.ts` exports
3. Built-in defaults (port: **3500**, host: 127.0.0.1, theme: auto)

---

### HTTP listen port and port hopping

**Default port:** `3500` (chosen to avoid colliding with common dev servers such as those on 3000).

**Port in use:** When binding fails with `EADDRINUSE`, the engine tries the next port (`port + 1`, then `+2`, …) up to **64** attempts, stopping at 65535. In non-test environments it logs a line to stderr for each hop, for example: `[lastriko] Port 3500 is in use, trying 3501…`.

**Ephemeral port:** Passing `port: 0` binds an OS-assigned ephemeral port; the actual port is read back from the server and exposed on `RunningServer.port`.

**Documented implementation:** Port hopping was introduced in commit `54360b7` (*feat(core): hop to next port on EADDRINUSE*). The default listen port was later changed from 3000 to **3500** in the same Phase 1 hardening pass.

---

### Theme CSS (`GET /style.css`)

The handler must not throw synchronously on missing files (that would crash the Node process for unrelated requests). Resolution order:

1. **`LASTRIKO_THEME_CSS`** — If set, path to a CSS file (absolute, or relative to `process.cwd()`). Used for custom themes or debugging.
2. **Monorepo dev** — `{cwd}/packages/core/src/theme/lastriko.css` when present (running from repository root).
3. **Package-relative** — `lastriko.css` next to the compiled engine module (`dist/theme/lastriko.css` after `npm run build` in `packages/core`).

If no file exists, the server responds with **500** and a short plain-text body. Published builds copy `src/theme/lastriko.css` into `dist/` so `file:` / npm installs work when the app’s cwd is an example directory or any project root.

---

### Stage 2: Server Start

```typescript
async function startServer(config: LastrikoConfig): Promise<Server> {
  // HTTP routes:
  //   GET /         → serve HTML shell (index.html with injected client JS + CSS links)
  //   GET /client.js → serve compiled client bundle
  //   GET /style.css → serve Lastriko CSS
  //   POST /upload   → file upload endpoint
  //   WS  /ws        → WebSocket upgrade
  //   + any routes registered by plugins
}
```

The "HTML shell" served at `/` is a minimal page with:
- `<link rel="stylesheet" href="/style.css">` — Lastriko's self-contained CSS
- `<script src="/client.js" defer></script>` — the client bundle
- An empty `<main id="lk-root"></main>` that the `RENDER` message fills
- The Lastriko toolbar (`.lk-toolbar`)

On connection, the client JS connects to `/ws`, sends `READY`, and the server fills `#lk-root` via the `RENDER` message.

**Dev mode only:** Start file watcher on the developer's script.

---

### Stage 3: Connection Handling

```typescript
function handleNewConnection(ws: WebSocket): void {
  // 1. Create ConnectionScope (UUID, empty atoms, empty handles)
  // 2. Wait for READY message
}

async function handleReady(scope: ConnectionScope, payload: ReadyPayload): Promise<void> {
  // 1. Apply stored theme preference from payload
  // 2. Create UIContext bound to this scope
  // 3. Call app() callback with UIContext
  // 4. Render full component tree to HTML
  // 5. Send RENDER { html, title, theme }
}
```

**Important:** `app()` is called once per connection. If a user opens two browser tabs, each tab gets its own `ConnectionScope` with independent state. There is no shared state between connections.

---

### Stage 4: Event Dispatch

```typescript
function handleEvent(scope: ConnectionScope, event: ClientEvent): void {
  switch (event.event) {
    case 'click': {
      // Invoke the button's bound onClick callback
      const handle = scope.getHandle(event.id);
      if (!handle || handle.type !== 'button') return;
      invokeCallback(scope, handle, event);
      break;
    }
    case 'change': {
      // Update the atom value — no automatic re-render
      const atom = scope.getAtom(event.id + '/value', undefined);
      atom?.set(event.value);
      break;
    }
  }
}

async function invokeCallback(
  scope: ConnectionScope,
  handle: ButtonHandle,
  event: ClientEvent
): Promise<void> {
  try {
    await handle.props.onClick(createButtonCallbackHandle(handle));
  } catch (err) {
    // Button callback threw — send TOAST only; button returns to normal state
    // ERROR (full-page overlay) is reserved for app() initial render failures
    scope.connection.send({ type: 'TOAST', payload: { message: String(err), type: 'error' } });
  }
}
```

**Key rule:** A `change` event (slider drag, text input) updates the atom but does NOT trigger any rendering. The new value is available via `handle.value` on the next button click or watcher read. This is fundamentally different from the Streamlit model — there are no automatic reactive re-renders from input changes alone.

---

### Stage 5: Disconnect

```typescript
function handleDisconnect(scope: ConnectionScope): void {
  scope.destroy();  // Runs cleanup fns, clears atoms and handles
}
```

---

### Stage 6: Shutdown

```typescript
async function shutdown(server: Server): Promise<void> {
  // 1. Stop accepting new connections
  // 2. Send TOAST 'Server shutting down' to all active connections
  // 3. Call teardown() on all plugins (reverse order)
  // 4. Close all WebSocket connections
  // 5. Close HTTP server
  // 6. Exit
}
process.on('SIGINT', () => shutdown(server));
process.on('SIGTERM', () => shutdown(server));
```

---

## HTML Rendering

The renderer takes a `ComponentHandle` and produces an HTML string. Every rendered component includes `data-lk-id` on its root element so the client can swap it:

```typescript
function renderComponent(handle: ComponentHandle<any>): string {
  const renderer = componentRenderers.get(handle.type);
  if (!renderer) throw new Error(`No renderer for component type: ${handle.type}`);
  const html = renderer(handle.props, handle.value, handle.id);
  // renderer is responsible for including data-lk-id="${handle.id}" on the root element
  return html;
}

// Example: textInput renderer
componentRenderers.set('textInput', (props, value, id) => `
  <div class="lk-field" data-lk-id="${id}">
    <label for="${id}-input">${escapeHtml(props.label)}</label>
    <input
      id="${id}-input"
      type="${props.type ?? 'text'}"
      value="${escapeHtml(String(value ?? ''))}"
      placeholder="${escapeHtml(props.placeholder ?? '')}"
      ${props.disabled ? 'disabled' : ''}
      data-lk-event="change"
    />
    ${props.helperText ? `<small>${escapeHtml(props.helperText)}</small>` : ''}
  </div>
`);
```

The client JS attaches event listeners to all elements with `data-lk-event` attributes, wiring them to `EVENT` messages.

---

## HTTP Server

### Bun Implementation

```typescript
Bun.serve({
  port: config.port,
  hostname: config.host ?? '127.0.0.1',
  fetch(req, server) {
    const url = new URL(req.url);
    if (server.upgrade(req)) return; // WebSocket upgrade
    return handleHttpRequest(url, req);
  },
  websocket: {
    open(ws) { handleNewConnection(ws); },
    message(ws, msg) { handleMessage(ws, msg as string); },
    close(ws) { handleDisconnect(scopeForWs.get(ws)!); },
  },
});
```

### Node.js Implementation (Phase 2)

```typescript
import http from 'node:http';
import { WebSocketServer } from 'ws';

const httpServer = http.createServer(handleHttpRequest);
const wss = new WebSocketServer({ server: httpServer });
wss.on('connection', (ws) => handleNewConnection(ws));
httpServer.listen(config.port, config.host ?? '127.0.0.1');
```

---

## File Watcher (Dev Mode Only)

```typescript
async function startWatcher(scriptPath: string, onReload: () => void): Promise<Watcher> {
  const debounceMs = 50;  // Editors often write in two passes
  let timer: Timer | null = null;

  function scheduleReload() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onReload, debounceMs);
  }

  if (typeof Bun !== 'undefined') {
    const watcher = Bun.watch(scriptPath);
    for await (const _ of watcher) scheduleReload();
    return { stop: () => watcher.return() };
  } else {
    const { watch } = await import('chokidar');
    const w = watch(scriptPath, { ignoreInitial: true });
    w.on('change', scheduleReload);
    return { stop: () => w.close() };
  }
}
```

**On reload:**
1. Send `TOAST 'Reloading...'` to all connections
2. Invalidate module cache for changed file
3. Re-import script module
4. For each active connection: call `app()` again with a fresh `UIContext`, render full HTML, send `RENDER`
5. State is NOT preserved — the connection scope is reset to defaults

---

## Runtime Detection

```typescript
const isBun = typeof Bun !== 'undefined';
```

This flag gates all Bun-native API usage. Node.js fallbacks are always available but only activated on Node.

---

## Error Handling

| Scenario | Behavior |
|---------|---------|
| `app()` throws during initial render | Send `ERROR` message → browser shows full-page error overlay. Server continues watching files. |
| Button `onClick` throws | Send `TOAST` with `type: 'error'`; button returns to normal state. Other UI is unaffected. `ERROR` message is NOT sent — that is reserved for `app()` failures. |
| WebSocket send fails (connection dropped) | Log error silently, mark connection as dead, call `scope.destroy()`. |
| Plugin `setup()` throws | Log warning, disable the plugin, continue without it. |
| Background watcher calls `.update()` after disconnect | `FRAGMENT` send fails silently — no-op. |

---

*Related docs: [PROTOCOL.md](PROTOCOL.md) | [STATE.md](STATE.md) | [PLUGIN-SYSTEM.md](PLUGIN-SYSTEM.md)*
