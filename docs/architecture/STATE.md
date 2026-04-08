# State Management Design

> **Back to:** [MANIFEST.md](../../MANIFEST.md#34-state-management)
> **Phase:** 1 (design), 3 (persistence enhancements)
> **Last updated:** 2026-04-07 — rewritten for handle-based, server-renders-HTML model

---

## Overview

Lastriko uses [Nanostores](https://github.com/nanostores/nanostores) for reactive state **on the server only**. The client has no state library — it is a pure display layer that receives HTML fragments and swaps them into the DOM.

This is a deliberate simplification from the original spec (which planned Nanostores on both server and client). Server-only state means the client bundle contains no state management code at all.

---

## Why Nanostores (Server Only)

| Criterion | Nanostores | Notes |
|-----------|-----------|-------|
| Bundle size | ~286 bytes | Negligible server overhead |
| Framework-agnostic | ✅ | No React/Vue dependency |
| TypeScript | Excellent | Full inference |
| Computed/derived | ✅ (`computed`) | For derived display values |
| Works in Node/Bun | ✅ | No DOM dependency |

---

## Connection Scope

**Every WebSocket connection gets its own isolated `ConnectionScope`.** Two clients connecting to the same demo have completely independent state. This is a prototyping tool — multi-user shared state is explicitly out of scope for v1.0.

```typescript
class ConnectionScope {
  readonly id: string;                               // UUID
  private atoms = new Map<string, WritableAtom<any>>();
  private handles = new Map<string, ComponentHandle<any>>();
  private cleanupFns: Array<() => void> = [];

  getAtom<T>(key: string, initialValue: T): WritableAtom<T> {
    if (!this.atoms.has(key)) {
      this.atoms.set(key, atom(initialValue));
    }
    return this.atoms.get(key) as WritableAtom<T>;
  }

  registerHandle(handle: ComponentHandle<any>): void {
    this.handles.set(handle.id, handle);
  }

  getHandle(id: string): ComponentHandle<any> | undefined {
    return this.handles.get(id);
  }

  onCleanup(fn: () => void): void {
    this.cleanupFns.push(fn);
  }

  destroy(): void {
    // Run all registered cleanup functions (stops background watchers, etc.)
    for (const fn of this.cleanupFns) {
      try { fn(); } catch { /* ignore cleanup errors */ }
    }
    this.atoms.clear();
    this.handles.clear();
    this.cleanupFns = [];
  }
}
```

When a connection closes, `scope.destroy()` is called. All atoms are freed, all handles are invalidated, all background callbacks registered via `scope.onCleanup()` are stopped.

---

## Input Component State

Input components (textInput, slider, toggle, select, etc.) store their current value in a Nanostores atom scoped to the connection:

```typescript
// Inside UIContext.textInput() (simplified)
textInput(label: string, opts?: TextInputOpts): InputHandle<string> {
  const id = this.generateId('textInput');
  const valueAtom = this.scope.getAtom<string>(id + '/value', opts?.default ?? '');

  const handle: InputHandle<string> = {
    id,
    type: 'textInput',
    props: { label, ...opts },
    get value() { return valueAtom.get(); },  // Always current
    update(data) { /* re-render and push FRAGMENT */ },
  };

  this.scope.registerHandle(handle);
  return handle;
}
```

When the client sends `EVENT { id, event: 'change', value: 'hello' }`, the server does:

```typescript
const atom = scope.getAtom<string>(event.id + '/value', '');
atom.set(event.value as string);
// No automatic re-render — only button callbacks and watchers trigger renders
```

The value is now available via `handle.value` on the next read (e.g., when a button onClick runs).

---

## The Handle `.update()` Mechanism

When `.update(data)` is called on any handle, the engine:

1. Merges `data` into the handle's current props/value
2. Re-renders the component to an HTML string (server-side)
3. Sends `FRAGMENT { id, html }` over the WebSocket
4. Client does `outerHTML` swap

```typescript
// Inside ComponentHandle.update() (simplified)
update(data: Partial<TProps & { value: TValue }>): void {
  // 1. Merge data into current props
  Object.assign(this.props, data);
  if ('value' in data) {
    this.scope.getAtom(this.id + '/value', undefined).set(data.value);
  }

  // 2. Re-render to HTML
  const html = renderComponent(this);

  // 3. Push fragment
  this.connection.send({
    type: 'FRAGMENT',
    payload: { id: this.id, html },
  });
}
```

---

## Background Watcher Pattern

Background watchers (processes that push updates without being triggered by a user event) hold a handle reference and call `.update()` whenever they have new data. They register a cleanup function so they stop when the connection closes:

```typescript
app('Monitor', (ui) => {
  const gpuMetric = ui.metric('GPU Usage', '0%');

  // Register cleanup so the watcher stops on disconnect
  const interval = setInterval(async () => {
    const usage = await fetchGPUUsage();
    gpuMetric.update(usage + '%');  // Pushes FRAGMENT
  }, 1000);

  // Important: register cleanup or the interval leaks
  ui.onDisconnect(() => clearInterval(interval));
});
```

`ui.onDisconnect(fn)` is a shorthand for `scope.onCleanup(fn)`.

---

## Button Callback State Access

Button callbacks are closures. They capture handle references at `app()` declaration time and read their `.value` when they execute. Because atoms are updated by `EVENT` messages before the callback runs, the values are always current at click time:

```typescript
app('Demo', (ui) => {
  const prompt = ui.textInput('Prompt');
  const temp = ui.slider('Temp', { min: 0, max: 2 });

  ui.button('Generate', async () => {
    // prompt.value and temp.value are current at the moment of click
    // They reflect what the user has typed/dragged
    const result = await generate(prompt.value, temp.value);
    // ...
  });
});
```

---

## Fire-and-Forget Pattern

Button callbacks can launch background operations without awaiting them. The operation runs independently and pushes updates via its captured handles:

```typescript
ui.button('Start Job', async (btn) => {
  const row = jobTable.prepend({ status: 'queued', name: 'job-' + Date.now() });

  // Fire and forget — do NOT await
  runLongJob().then((result) => {
    row.update({ status: 'complete', result });
  }).catch((err) => {
    row.update({ status: 'failed', error: err.message });
  });

  // Button returns immediately — user can click again
});
```

This is explicitly supported. Multiple concurrent background jobs hold separate row handles and update independently.

---

## Plugin State

Plugins can create named atoms scoped to a connection via `PluginContext.getStore()`:

```typescript
setup(ctx: PluginContext) {
  ctx.onConnection((scope) => {
    // Per-connection store — namespaced by plugin name automatically
    const historyAtom = ctx.getStore<Message[]>('chat-history', []);
    // atom key internally: 'openai/chat-history' (namespaced by plugin name automatically)
  });
}
```

Plugin atoms are part of the connection scope and are destroyed with it.

---

## Memory Management

| Scenario | Behavior |
|---------|---------|
| Connection closes | `scope.destroy()` — all atoms freed, all cleanup fns run |
| Button callback holds handle after connection closes | `.update()` is a no-op (connection gone, send fails silently) |
| Background watcher not cleaned up | Continues running, `.update()` is no-op — harmless but wasteful. Use `ui.onDisconnect()`. |
| Hot reload | New `app()` call creates new handles. Old handles from previous execution are abandoned (connection still exists, old IDs still in DOM until `RENDER` replaces them). |

---

## State Persistence (Phase 3)

By default, all state resets on page refresh (new connection = new scope). Phase 3 adds opt-in `localStorage` persistence for input values:

```typescript
defineConfig({
  persistence: 'localStorage',  // 'none' (default) | 'localStorage'
})
```

When enabled: on `READY`, the client includes stored input values in the payload. The server initialises atoms with these values instead of component defaults. The rendered HTML reflects the restored values.

---

*Related docs: [ENGINE.md](ENGINE.md) | [PROTOCOL.md](PROTOCOL.md)*
