# WebSocket Communication Protocol

> **Back to:** [MANIFEST.md](../../MANIFEST.md#33-communication-protocol)
> **Phase:** 1 (initial), updated in Phase 3 (streaming additions)
> **Last updated:** 2026-04-07 — rewritten for HTML-fragment model

---

## Design Decision

Lastriko sends **HTML fragments, not JSON data structures**. When a component updates, the server re-renders that component to an HTML string and sends it. The client does a single `outerHTML` swap keyed by component ID.

**Why this matters:**
- No diffing algorithm needed on the client
- No client-side templating
- Client bundle stays under 15KB
- Server-side rendering means any server library can be used (Shiki, sharp, etc.)
- The mental model is simple: server owns rendering, client owns display

---

## Message Envelope

All messages are JSON strings over a single WebSocket connection at `/ws`.

```typescript
interface Message {
  type: MessageType;
  payload: unknown;
  seq?: number;    // Optional sequence number — monotonically increasing per connection
}
```

---

## Server → Client Messages

### `RENDER`

Sent once per connection after `READY`. Contains the full rendered HTML for the page body.

```typescript
{
  type: 'RENDER',
  payload: {
    html: string,        // Full <body> inner HTML
    title: string,       // Page title
    theme: 'light' | 'dark',
  }
}
```

**Client behavior:** Replace `document.body.innerHTML` with `html`. Set `document.title`. Apply theme.

---

### `FRAGMENT`

The most frequent message. Sent when any component handle's `.update()` is called.

```typescript
{
  type: 'FRAGMENT',
  payload: {
    id: string,    // Component ID — matches data-lk-id attribute in the DOM
    html: string,  // Complete HTML for this component, including the root element
  }
}
```

**Client behavior:**
```typescript
function applyFragment(id: string, html: string): void {
  const el = document.querySelector(`[data-lk-id="${id}"]`);
  if (el) el.outerHTML = html;
}
```

**Root element convention:** Every component's rendered HTML must have `data-lk-id="${id}"` on its outermost element. The server is responsible for including this attribute when rendering component HTML.

---

### `STREAM_CHUNK`

Appends a text chunk to a `streamText` component. Separate from `FRAGMENT` because append is more efficient than full re-render for streaming.

```typescript
{
  type: 'STREAM_CHUNK',
  payload: {
    id: string,       // streamText component ID
    chunk: string,    // Text to append
    done: boolean,    // true on last chunk — hides cursor
    format: 'plain' | 'markdown',  // How to render the chunk
  }
}
```

**Client behavior:** Find the streamText element by ID, append the chunk to its content node. If `format: 'markdown'`, trigger a re-parse of the accumulated text. If `done: true`, hide the blinking cursor.

---

### `THEME`

```typescript
{
  type: 'THEME',
  payload: { mode: 'light' | 'dark' }
}
```

**Client behavior:** `document.documentElement.setAttribute('data-theme', mode)`. CSS custom properties update instantly — no re-render needed.

---

### `TOAST`

```typescript
{
  type: 'TOAST',
  payload: {
    message: string,
    type: 'info' | 'success' | 'warning' | 'error',
    duration?: number,   // ms, default 4000
    id?: string,         // For deduplication (same id = replace existing)
  }
}
```

**Client behavior:** Inject a toast element into the fixed toast container. Auto-remove after `duration`.

---

### `NAVIGATE`

```typescript
{
  type: 'NAVIGATE',
  payload: { page: string }
}
```

**Client behavior:** Update URL hash (`#/page-name`). The server then sends a `FRAGMENT` for the main content area with the new page's HTML.

---

### `ERROR`

Sent when the developer's `app()` callback throws an unhandled exception, or when `onClick` throws and there is no result area to target.

```typescript
{
  type: 'ERROR',
  payload: {
    message: string,
    stack?: string,      // Only in dev mode
    file?: string,
    line?: number,
  }
}
```

**Client behavior:** Show full-page error overlay. Clear on next `RENDER` (i.e., after hot reload fixes the error).

---

## Client → Server Messages

### `READY`

```typescript
{
  type: 'READY',
  payload: {
    viewport: { width: number, height: number },
    theme: 'light' | 'dark' | null,  // Stored preference from localStorage
  }
}
```

**Server behavior:** Create `ConnectionScope`, call `app()`, render full HTML, send `RENDER`.

---

### `EVENT`

```typescript
{
  type: 'EVENT',
  payload: {
    id: string,
    event: 'click' | 'change' | 'blur' | 'focus',
    value?: unknown,     // Present for 'change' events; type depends on component
  }
}
```

**Event type by component:**

| Component | Event | Value |
|-----------|-------|-------|
| `button` | `click` | `null` |
| `textInput` | `change` | `string` |
| `numberInput` | `change` | `number` |
| `slider` | `change` | `number` |
| `toggle` | `change` | `boolean` |
| `select` | `change` | `string` |
| `multiSelect` | `change` | `string[]` |
| `colorPicker` | `change` | `string` (hex) |
| `dateInput` | `change` | `string` (ISO date) |
| `tabs` | `change` | `string` (active label) |

**Server behavior for `click`:** Invoke the bound `onClick` callback for that button ID.

**Server behavior for `change`:** Update the component's atom value. The handle's `.value` getter now returns the new value. The server does NOT automatically re-render anything — only the button callback (or background watcher) decides what to update. This is a key difference from the Streamlit model.

---

### `RESIZE`

```typescript
{
  type: 'RESIZE',
  payload: { width: number, height: number }
}
```

Debounced 200ms on the client.

---

### `THEME_CHANGE`

```typescript
{
  type: 'THEME_CHANGE',
  payload: { mode: 'light' | 'dark' }
}
```

Sent when the user clicks the toolbar theme toggle.

---

## File Upload Protocol

Files are NOT transported over WebSocket. See [INPUTS.md](../components/INPUTS.md#fileupload) for the HTTP POST `/upload` flow.

After a successful HTTP upload, the client sends a standard `EVENT` message with `event: 'change'` and `value: { name, path, size, type }`.

---

## Connection Lifecycle

```
Client connects to /ws
        ↓
Server creates ConnectionScope (UUID, isolated atoms)
        ↓
Client sends READY (viewport, stored theme preference)
        ↓
Server calls app() → renders full HTML → sends RENDER
        ↓
    ┌───────────────── NORMAL OPERATION ─────────────────┐
    │                                                     │
    │  Client: EVENT { id, event, value }                 │
    │      ↓                                              │
    │  Server: update atom / invoke onClick               │
    │      ↓                                              │
    │  Server: re-render changed components               │
    │      ↓                                              │
    │  Server: FRAGMENT { id, html } (one per change)     │
    │      ↓                                              │
    │  Client: outerHTML swap                             │
    │                                                     │
    │  Background push (anytime):                         │
    │  Server: FRAGMENT / STREAM_CHUNK / TOAST            │
    └─────────────────────────────────────────────────────┘
        ↓
Client disconnects
        ↓
Server: ConnectionScope.destroy() — all handles, atoms GC'd
```

---

## Message Validation

All incoming messages are validated before processing:

```typescript
const VALID_CLIENT_TYPES = new Set(['READY', 'EVENT', 'RESIZE', 'THEME_CHANGE']);

function validateMessage(raw: unknown): ClientMessage | null {
  if (typeof raw !== 'string') return null;
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!isObject(parsed) || !VALID_CLIENT_TYPES.has((parsed as any).type)) return null;
  return parsed as ClientMessage;
}
```

Malformed or unknown message types are silently dropped. Warning logged in dev mode.

---

## Rate Limiting

Default: 100 messages/second per connection. Configurable via `defineConfig({ websocket: { rateLimit: 100 } })`. Excess messages are dropped (not disconnected). Warning toast shown in dev mode.

---

*Related docs: [ENGINE.md](ENGINE.md) | [STATE.md](STATE.md)*
