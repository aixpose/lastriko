# Phase 3 — Advanced Components & Polish

> **Back to:** [MANIFEST.md](../../MANIFEST.md)
> **Status:** In Progress
> **Target version:** `0.2.0`

---

## Goal

Feature parity with the full component table specified in the manifesto. Production-quality styling. Performance optimization. Accessibility compliance.

This phase makes Lastriko a **complete** prototyping toolkit, not just a minimal one.

---

## Exit Criteria

1. Every component listed in MANIFEST.md Section 4 is implemented and documented.
2. All components pass ARIA audit (aXe or similar) with zero critical violations.
3. WebSocket message batching is implemented and measurably reduces network traffic.
4. Hot reload with `hotReloadPreserve: true` (default) preserves input values, scroll position, and active tabs across reloads.
5. **All unit, integration, and E2E tests pass.** Coverage gates maintained. Every component added in this phase has a co-located test file. No Phase 3 component is merged without tests.

---

## Pre-Phase Decisions Required

| # | Question | Ref |
|---|----------|-----|
| `modelCompare` parallel async | Parallel `Promise.all`, independent `StreamHandle` per column | ✅ Resolved |
| `parameterPanel` schema format | Custom Lastriko typed-object `{ key: { type, label, min, max, step, options, default } }` | ✅ Resolved |
| Image/video optimization | Client-side lazy loading — `loading="lazy"` on all `<img>` and `<video>` | ✅ Resolved |
| State persistence across sessions | No persistence — every refresh starts fresh | ✅ Resolved |
| Multi-page support (`ui.page()`) | Deferred — `ui.tabs()` covers the use case; no `ui.page()` in Phase 3 | ✅ Resolved |

---

## Deliverables

## Phase 3 Start Snapshot (already done)

The following scope is already implemented before new Phase 3 work begins:

- `image` and `imageGrid` render with `loading="lazy"` (client-side lazy loading decision already applied).
- Baseline ARIA improvements landed for existing Phase 2 components.
- Server emits `ERROR` messages when initial `app()` render fails; client auto-retry reconnect loop exists.

These do **not** satisfy all Phase 3 exit criteria by themselves; they are the baseline.

### 1. Remaining Input Components

| Component | Notes |
|-----------|-------|
| `multiSelect` | Checkbox group. `value` is `string[]`. |
| `colorPicker` | `<input type="color">`. `value` is hex string `#rrggbb`. |
| `dateInput` | `<input type="date">`. `value` is ISO date string `YYYY-MM-DD`. |

Full specs: [docs/components/INPUTS.md](../components/INPUTS.md)

---

### 2. Remaining Display Components

| Component | Notes |
|-----------|-------|
| `video` | HTML5 `<video>`. `src` can be URL or local path. Controls shown. |
| `audio` | HTML5 `<audio>`. Controls shown. Optional waveform visualization (stretch goal). |
| `diff` | Side-by-side text diff. Uses line-level diffing. Added lines green, removed lines red. Inline mode toggle. |

Full specs: [docs/components/DISPLAY.md](../components/DISPLAY.md)

---

### 3. Remaining Layout Components

| Component | Notes |
|-----------|-------|
| `accordion` | Array-based `[{ label, content }]`. `defaultOpen` per section. `allowMultiple` option. |
| `fullscreen` | Modal overlay. `trigger: 'button' \| 'manual'`. `close()` / `open()` on handle. |

Full specs: [docs/components/LAYOUT.md](../components/LAYOUT.md)

---

### 4. Remaining AI Components

| Component | Notes |
|-----------|-------|
| `modelCompare` | N-column layout via `grid()`, one `StreamHandle` per model. All models called in parallel; one erroring does not affect others. |
| `parameterPanel` | Auto-generates sliders/toggles/selects from custom typed-object schema: `{ key: { type, min, max, default } }`. |
| `filmStrip` | Horizontal scroll. Click to expand. Thumbnail generation for video sources. |
| `beforeAfter` | CSS clip-path-based slider. Drag handle between two images. |

Full specs: [docs/components/AI.md](../components/AI.md)

---

### 5. Performance Optimizations

**WebSocket message batching:**
- Accumulate `FRAGMENT` and `STREAM_CHUNK` messages within a 16ms (one frame) window and send as a single batch
- Add `BATCH` message type to the protocol: `{ type: 'BATCH', messages: Message[] }`
- This must be added to [docs/architecture/PROTOCOL.md](../architecture/PROTOCOL.md) before implementation

**Virtual scrolling for large tables:**
- `table` component with > 100 rows should use virtual scrolling
- Only DOM nodes for visible rows are created
- Use `IntersectionObserver` for visibility detection

**Lazy image loading:**
- All `image` and `imageGrid` components use `loading="lazy"`
- Images outside the viewport do not load until scrolled into view

**Performance acceptance criteria:**
- `table` with 10,000 rows renders initial viewport in < 100ms
- Sending 50 rapid slider `EVENT` messages results in ≤ 4 `FRAGMENT` (or `BATCH`) messages sent back
- Page with 100 images loads first paint in < 100ms (lazy loading)

---

### 6. Accessibility

Every component must meet WCAG 2.1 AA standards:

| Requirement | How |
|------------|-----|
| All interactive elements have ARIA labels | `aria-label` or `aria-labelledby` |
| Keyboard navigation works for all components | `tabindex`, `keydown` handlers |
| Screen reader announces state changes | `aria-live` regions for dynamic content |
| Color is not the only differentiator | Icons + color for `alert` types |
| Focus is visible at all times | No `outline: none` without replacement |
| All images have `alt` text | Required prop for `image`, derived from `caption` if provided |

**Acceptance criteria:** aXe DevTools audit of all components returns zero critical or serious violations.

---

### 7. Error Handling

**Developer-facing errors (in UI during development):**
- Unhandled exception in `app()` callback: display a full-screen error overlay with message + stack trace
- Plugin not found: render placeholder component with message "Plugin @lastriko/X is required"
- WebSocket disconnection: show reconnecting banner, auto-retry

**Acceptance criteria:**
- Throwing an error inside `app()` shows the error in-browser with the source location
- The terminal (server) also logs the error with full context
- After fixing the error and saving, hot reload recovers automatically

---

### 8. Hot Reload State Preservation

**Phase 1–2 behaviour:** Hot reload resets all state — full `RENDER` sent, nothing restored.

**Phase 3 introduces `hotReloadPreserve`** (enabled by default in Phase 3+):

```typescript
// lastriko.config.ts
export default defineConfig({
  hotReloadPreserve: true,  // default: true once Phase 3 ships
})
```

**Preserved across hot reload (matched by stable component ID):**
- Input values — `textInput`, `numberInput`, `slider`, `toggle`, `select`
- Scroll position — `window.scrollY` + per-container scroll offsets
- Active tab — `ui.tabs()` active label

**NOT preserved (always resets):**
- `streamText` content
- Runtime-appended `table` rows
- `chatUI` message history

**Implementation:** Client snapshots these values into `sessionStorage` before the new `RENDER` arrives. After rendering, values are restored into matching component IDs. Components without a matching ID (new components) use their declared defaults.

**Acceptance criteria (exit criterion for Phase 3):**
- Save a script with a slider at value 1.5 → hot reload → slider is still at 1.5
- Page is scrolled 500px → hot reload → scroll restored to 500px
- Active tab is "Results" → hot reload → "Results" tab still active
- New component added to script → hot reload → new component renders with default value

---

## Testing Requirements for Phase 3

| Test | Type | What |
|------|------|------|
| All components: zero aXe critical violations | Accessibility | All 40+ components |
| WebSocket batching: 50 events → ≤ 4 messages | Performance | `slider` rapid input |
| `table` 10K rows first render < 100ms | Performance | Benchmark |
| `beforeAfter` drag handle works on touch devices | E2E | Mobile viewport in Playwright |
| `modelCompare` with 3 models, 1 erroring | Unit | Partial failure handling |
| Multi-page navigation: state isolated per page | Integration | Cross-page contamination test |
| Hot reload: scroll position preserved | E2E | Playwright |
| Error overlay: shows on throw in `app()` | E2E | Playwright |

---

## Non-Goals for Phase 3

- Standalone `sidebar()` component — sidebar is a region of `ui.shell()` (Phase 2, done)
- LLM plugins (Phase 4)
- Desktop export (Phase 5)
- `ui.share()` / tunneling (Phase 5)
- Docker export (Phase 5)
- Templates gallery (Phase 6)

---

*[← Phase 2](PHASE-2.md) — Phase 3 of 6 — [Next: Phase 4 →](PHASE-4.md)*
