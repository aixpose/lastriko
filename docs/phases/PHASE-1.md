# Phase 1 — Infrastructure & Foundation

> **Back to:** [MANIFEST.md](../../MANIFEST.md)
> **Status:** Not Started
> **Target version:** `0.0.1` (internal, Bun-only, not published)

---

## Goal

A working skeleton that can serve a page over WebSocket, call `app()` once per connection, render HTML fragments, and handle button click events. This phase establishes the build pipeline, monorepo structure, CI/CD, and the core server/client communication layer.

**Nothing is user-facing yet. This phase is about correctness and architecture, not features.**

---

## Exit Criteria

**All of the following must pass before Phase 2 begins:**

### Functional
- `bunx create-lastriko hello && cd hello && bun dev` opens a browser page
- Title, a text element, and a button are displayed and styled
- Clicking the button updates the text via `FRAGMENT`
- Hot reload sends a fresh `RENDER` on file save
- No console errors

### Tests (non-negotiable)
- All unit tests pass: `bun test`
- All integration tests pass: `bun test:integration`
- Coverage gates met: engine ≥ 90%, components ≥ 90%, client ≥ 80%
- Bundle size check passes: client ≤ 15KB gzip

If any test fails or any coverage gate is missed, Phase 1 is not complete.

---

## All Pre-Phase Decisions — Resolved

All decisions that were blocking Phase 1 are now resolved:

| Decision | Outcome |
|----------|---------|
| Execution model | `app()` once per connection; button callbacks are bound handlers |
| Component IDs | Assigned at declaration time; stable for connection lifetime |
| State isolation | Per-connection `ConnectionScope`; fully isolated |
| Monorepo | Turborepo + Bun workspaces |
| CSS | Self-contained `lastriko.css` (~8KB); no CDN |
| Client rendering | `outerHTML` swap keyed by `data-lk-id`; no diffing library |
| Package name | `lastriko` |

---

## Deliverables

### 1. Monorepo Setup

**Acceptance criteria:**
- `bun install` at root installs all workspace dependencies
- `turbo build` runs successfully for all packages
- TypeScript strict mode (`strict: true`) in all `tsconfig.json` files
- ESLint + `@antfu/eslint-config` enforces no errors
- Prettier config committed

**Files:**
- `package.json` (workspace root with Bun workspaces)
- `turbo.json` (build + test pipeline)
- `tsconfig.base.json`
- `.eslintrc.json`, `.prettierrc`
- `packages/core/package.json`, `packages/core/tsconfig.json`
- `packages/core/src/index.ts`

---

### 2. Core Engine

**Acceptance criteria:**
- `Bun.serve()` serves static files from `public/`
- WebSocket at `/ws` accepts connections
- App lifecycle (Bootstrap → Server Start → Connection → Runtime Loop → Disconnect → Shutdown) implemented per [ENGINE.md](../architecture/ENGINE.md)
- `app(title, callback)` exported from `packages/core/src/index.ts`
- `ConnectionScope` created per connection; destroyed on disconnect
- `app()` called once per connection; `UIContext` passed to callback

**Phase 1 scope — Bun only** (Node.js fallback added in Phase 2).

**Files:**
- `packages/core/src/engine/server.ts`
- `packages/core/src/engine/websocket.ts`
- `packages/core/src/engine/lifecycle.ts`
- `packages/core/src/engine/executor.ts`
- `packages/core/src/engine/renderer.ts`
- `packages/core/src/engine/watcher.ts` (dev mode only)

---

### 3. Component Handle System

**Acceptance criteria:**
- `ComponentHandle<TProps, TValue>` interface as defined in [MANIFEST.md §3.2](../../MANIFEST.md#32-component-model)
- Every handle has `id`, `type`, `props`, `update()`, and for inputs: `value`
- `update(data)` re-renders the component to HTML and sends `FRAGMENT { id, html }`
- `ButtonHandle` with `setLoading(bool)` passed to `onClick` callback
- `ConnectionScope` registers and retrieves handles by ID

**Files:**
- `packages/core/src/components/types.ts`
- `packages/core/src/components/context.ts` (UIContext class)
- `packages/core/src/components/id.ts`
- `packages/core/src/components/registry.ts`

**Phase 1 components (minimum for exit criteria):**
- `ui.text(content)` → `TextHandle`
- `ui.button(label, onClick)` → `ButtonHandle`

---

### 4. HTML Renderer

**Acceptance criteria:**
- `renderComponent(handle)` produces a valid HTML string
- Root element always has `data-lk-id="${handle.id}"`
- All user-supplied strings are HTML-escaped
- `renderPage(tree)` produces the full `<body>` inner HTML

**Files:**
- `packages/core/src/engine/renderer.ts`

---

### 5. Client Bundle

**Acceptance criteria:**
- Client establishes WebSocket to `/ws` on load
- Sends `READY` message (viewport + stored theme)
- On `RENDER`: replaces `document.getElementById('lk-root').innerHTML`
- On `FRAGMENT`: finds `[data-lk-id="${id}"]`, replaces `outerHTML`
- On `TOAST`: injects toast into fixed container
- On `THEME`: sets `data-theme` on `<html>`
- Sends `EVENT { id, event: 'click' }` when button clicked
- Sends `EVENT { id, event: 'change', value }` when input changes
- Reconnects with exponential backoff on disconnect
- Bundle size after `bun build`: **≤ 15KB gzip**

**Files:**
- `packages/core/src/client/index.ts`
- `packages/core/src/client/ws.ts`
- `packages/core/src/client/swap.ts` (outerHTML fragment application)
- `packages/core/src/client/events.ts` (event delegation)

---

### 6. CSS Foundation

**Acceptance criteria:**
- `lastriko.css` served at `/style.css` by the engine
- All `--lk-*` tokens defined on `:root` (per [THEMING.md](../THEMING.md))
- `[data-theme="dark"]` overrides defined
- Base element styles (body, inputs, buttons, table) styled
- Light and dark modes both render correctly
- Toolbar (`.lk-toolbar`) with theme toggle button

**Files:**
- `packages/core/src/theme/lastriko.css`

---

### 7. Plugin Interface (Stubs)

**Acceptance criteria:**
- `LastrikoPlugin` and `PluginContext` interfaces defined
- `app()` accepts optional `plugins: LastrikoPlugin[]`
- `setup()` called during Bootstrap; `teardown()` called during Shutdown
- No actual plugins ship in Phase 1 — interfaces only

**Files:**
- `packages/core/src/plugins/types.ts`
- `packages/core/src/plugins/registry.ts`

---

### 8. CLI Scaffold (`create-lastriko`)

**Acceptance criteria:**
- `bunx create-lastriko hello` creates a `hello/` directory with a working `demo.ts`
- `bun dev` inside the created project opens a browser and shows the demo
- Template includes `package.json`, `tsconfig.json`, `.gitignore`, `README.md`

**Files:**
- `packages/create-lastriko/src/index.ts`
- `packages/create-lastriko/templates/minimal/`

---

### 9. CI/CD

**Acceptance criteria:**
- `.github/workflows/ci.yml` runs on every PR: type check, lint, unit tests, build, bundle size check
- Bundle size check: fails if `packages/core` client bundle > 15KB gzip
- Bun-only in Phase 1 (Node.js matrix added in Phase 2)

---

## Testing Requirements for Phase 1

Every deliverable above must have corresponding tests before the deliverable is considered done. Tests are written alongside the code — not after.

| Test | Type | Coverage area |
|------|------|---------------|
| `renderComponent` includes `data-lk-id` on root | Unit | Renderer |
| Rendered HTML escapes user content (XSS) | Unit | Renderer |
| `ConnectionScope` is isolated per connection | Unit | State |
| Destroying scope cleans up all atoms | Unit | State |
| Component ID is stable for same declaration position | Unit | ID generation |
| `update()` merges props correctly | Unit | Handle |
| READY → RENDER handshake (full WS lifecycle) | Integration | Engine |
| Button click → callback runs → FRAGMENT sent | Integration | Engine |
| `update()` on handle → `FRAGMENT` with correct id and HTML | Integration | Handle |
| Two concurrent connections have independent state | Integration | Isolation |
| Hot reload → fresh `RENDER` sent; state reset | Integration | Dev mode |
| File watcher debounce: rapid saves → single reload | Integration | Watcher |
| Client `FRAGMENT` swap: correct element replaced | E2E | Client |
| Client reconnects after server restart | E2E | Client |
| Client bundle ≤ 15KB gzip | Build | CI gate |
| Coverage gates: engine ≥ 90%, components ≥ 90%, client ≥ 80% | Build | CI gate |

---

## Non-Goals for Phase 1

- Any component beyond `text()` and `button()` (Phase 2)
- Node.js fallback (Phase 2)
- LLM integration (Phase 4)
- Desktop export (Phase 5)
- npm publish (Phase 2)

---

*Phase 1 of 6 — [Next: Phase 2 →](PHASE-2.md)*
