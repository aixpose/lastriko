# Feedback Components — Specification

> **Back to:** [MANIFEST.md](../../MANIFEST.md#44-feedback-components)
> **Phase:** 2 (all feedback components)

---

## Design Rules for Feedback Components

1. Feedback components communicate system state to the user — they are not interactive controls.
2. Toast notifications are non-blocking and dismiss automatically.
3. Alert banners are inline and persistent until explicitly dismissed or the page re-renders.
4. Loading states must communicate clearly that something is in progress.
5. `streamText` is the primary component for LLM output — it must handle slow connections and large outputs gracefully.

---

## `toast`

**API:**
```typescript
ui.toast(message: string, opts?: ToastOpts): void

interface ToastOpts {
  type?: 'info' | 'success' | 'warning' | 'error';  // Default: 'info'
  duration?: number;     // Milliseconds before auto-dismiss (default: 4000)
  action?: {             // Optional action button inside the toast
    label: string;
    onClick: () => void;
  };
}
```

**Behavior:**
- Toast appears in the bottom-right corner (or bottom-center on mobile).
- Slides in with a CSS animation.
- Auto-dismisses after `duration` ms.
- Can be manually dismissed by clicking an X button.
- Multiple toasts stack vertically (max 3 visible at once; older toasts are removed if a 4th arrives).

**Rendered via:** `TOAST` WebSocket message from server → client creates a DOM element outside the main component tree (in a fixed-position toast container).

**Note:** `toast()` is the only component that does NOT add a node to the component tree. It triggers a side-effecting `TOAST` WebSocket message instead. This is a deliberate design exception.

**Phase:** 2

---

## `alert`

**API:**
```typescript
ui.alert(message: string, opts?: AlertOpts): void

interface AlertOpts {
  type?: 'info' | 'success' | 'warning' | 'error';  // Default: 'info'
  title?: string;         // Optional bold title above message
  dismissible?: boolean;  // Show X button (default: false)
  icon?: boolean;         // Show type icon (default: true)
}
```

**Renders as:** `<div role="alert" class="lk-alert lk-alert--${type}">` with appropriate ARIA role.

**Visual design:**
- `info`: blue left border, info icon
- `success`: green left border, checkmark icon
- `warning`: yellow left border, warning triangle icon
- `error`: red left border, error circle icon

**Contrast:** All alert types must maintain WCAG AA contrast ratios in both light and dark mode.

**Position:** Inline — renders at the position in the script where `ui.alert()` is called.

**Re-render behavior:** If the same alert is re-rendered (same content, same type), the DOM element is patched in place — no flicker.

**Phase:** 2

---

## `loading`

**API:**
```typescript
ui.loading(opts?: LoadingOpts): void
// OR
ui.loading(message: string, opts?: Omit<LoadingOpts, 'message'>): void

interface LoadingOpts {
  message?: string;        // Default: 'Loading...'
  mode?: 'fullpage' | 'inline';  // Default: 'inline'
  size?: 'sm' | 'md' | 'lg';    // Default: 'md'
}
```

**Modes:**
- `inline`: renders a spinner + message inline at the component's position. Used for component-level loading states.
- `fullpage`: renders a centered overlay covering the entire viewport. Used while the `app()` callback is executing asynchronously before the first render.

**Typical usage:**
```typescript
app('Demo', async (ui) => {
  ui.loading({ message: 'Loading model...', mode: 'fullpage' });
  
  const model = await loadModel();  // async operation
  
  // After this line, the loading overlay is replaced by actual content
  ui.text('Model loaded!');
  // ... rest of components
});
```

**Phase:** 2

---

## `streamText`

**API:**
```typescript
ui.streamText(opts?: StreamTextOpts): StreamHandle

interface StreamTextOpts {
  format?:    'plain' | 'markdown'  // Default: 'markdown'
  cursor?:    boolean                // Blinking cursor while streaming (default: true)
  label?:     string                 // Optional label above output
  maxHeight?: number                 // Scroll after this height (px)
}

interface StreamHandle extends ComponentHandle<StreamTextProps> {
  append(chunk: string): void    // Push a text chunk — sends STREAM_CHUNK to client
  done(): void                   // Signal stream complete — hides cursor
  clear(): void                  // Reset content to empty
  text: string                   // Full accumulated text so far
  isStreaming: boolean
}
```

**Usage:**
```typescript
const output = ui.streamText({ label: 'Response' })

ui.button('Generate', async (btn) => {
  btn.setLoading(true)
  output.clear()                          // reset from previous run

  for await (const chunk of callLLM(prompt.value)) {
    output.append(chunk)                  // sends STREAM_CHUNK fragment
  }
  output.done()                           // hides cursor
  btn.setLoading(false)
})
```

**Concurrency:** Multiple `streamText` handles on the same page stream independently. Each handle has its own ID and `STREAM_CHUNK` messages are targeted by ID. If a button is clicked while a previous stream is still running, start a new one by calling `output.clear()` first, or lock the button with `btn.setLoading(true)` to prevent concurrent runs.

**Format:** `'markdown'` re-parses accumulated text on each chunk append (good for LLM responses). `'plain'` appends text verbatim (good for log output).

**Phase:** 2

---

## Streaming Protocol

`streamText` uses two dedicated messages (defined in [PROTOCOL.md](../architecture/PROTOCOL.md)):

`STREAM_CHUNK` — sent per `.append(chunk)` call:
```typescript
{ type: 'STREAM_CHUNK', payload: { id: string, chunk: string, done: boolean, format: 'plain' | 'markdown' } }
```

`STREAM_ERROR` — sent if the button callback throws while streaming:
```typescript
{ type: 'STREAM_ERROR', payload: { id: string, error: string } }
```

The client appends the chunk to the component's DOM node on each `STREAM_CHUNK`. When `done: true`, the blinking cursor is hidden. No full `FRAGMENT` re-render is used for streaming — appending is more efficient.

---

*Related docs: [INPUTS.md](INPUTS.md) | [DISPLAY.md](DISPLAY.md) | [LAYOUT.md](LAYOUT.md) | [AI.md](AI.md)*
