# LASTRIKO — Project Manifesto

> **The TypeScript UI Toolkit for AI Demos & Rapid Prototyping**
>
> Version 0.1.11 — April 2026
> AIXPOSE OÜ

---

## How to Use This Document

This file is the **single source of truth** for the Lastriko project. Every architectural decision, component API, phase goal, and design principle lives here or in a linked sub-document.

**Rule 0 — Manifesto First:** Before writing any code, the relevant section of this document (or a linked phase/component doc) must already describe what you are building. If it does not, update the manifesto first, get it reviewed, then write the code.

See [`.cursor/rules/`](.cursor/rules/) for the enforced Cursor rules that implement this principle in practice.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Core Engine Specification](#3-core-engine-specification)
4. [Component Library](#4-component-library)
5. [Theming System](#5-theming-system)
6. [Plugin System](#6-plugin-system)
7. [Desktop Export](#7-desktop-export-neutralinojs-integration)
8. [Project Structure](#8-project-structure)
9. [Developer Experience](#9-developer-experience)
10. [Dependency Philosophy](#10-dependency-philosophy)
11. [Development Phases & Roadmap](#11-development-phases--roadmap)
12. [API Design Principles](#12-api-design-principles)
13. [Performance Targets](#13-performance-targets)
14. [Testing Strategy](#14-testing-strategy)
15. [Security Considerations](#15-security-considerations)
16. [Licensing & Publishing](#16-licensing--publishing)
17. [Competitive Positioning](#17-competitive-positioning)
18. [Success Metrics](#18-success-metrics)
19. [Appendix A — Full API Quick Reference](#appendix-a-full-api-quick-reference)


**Sub-documents:**

- [docs/phases/PHASE-2.md](docs/phases/PHASE-2.md) — MVP Components
- [docs/phases/PHASE-3.md](docs/phases/PHASE-3.md) — Advanced Components & Polish
- [docs/phases/PHASE-4.md](docs/phases/PHASE-4.md) — Plugin Ecosystem
- [docs/phases/PHASE-5.md](docs/phases/PHASE-5.md) — Desktop & Distribution
- [docs/phases/PHASE-6.md](docs/phases/PHASE-6.md) — Ecosystem & Community
- [docs/architecture/ENGINE.md](docs/architecture/ENGINE.md) — Core engine internals
- [docs/architecture/PROTOCOL.md](docs/architecture/PROTOCOL.md) — WebSocket communication protocol
- [docs/architecture/STATE.md](docs/architecture/STATE.md) — State management design
- [docs/architecture/PLUGIN-SYSTEM.md](docs/architecture/PLUGIN-SYSTEM.md) — Plugin architecture
- [docs/components/INPUTS.md](docs/components/INPUTS.md) — Input component specs
- [docs/components/DISPLAY.md](docs/components/DISPLAY.md) — Display component specs
- [docs/components/LAYOUT.md](docs/components/LAYOUT.md) — Layout component specs
- [docs/components/FEEDBACK.md](docs/components/FEEDBACK.md) — Feedback component specs
- [docs/components/AI.md](docs/components/AI.md) — AI-specific component specs
- [docs/THEMING.md](docs/THEMING.md) — Theming system and CSS tokens
- [docs/TESTING.md](docs/TESTING.md) — Testing strategy and CI pipeline
- [docs/SECURITY.md](docs/SECURITY.md) — Security model and considerations
- [docs/API-REFERENCE.md](docs/API-REFERENCE.md) — Full public API reference
- [docs/COMPETITIVE.md](docs/COMPETITIVE.md) — Competitive analysis

---

## Changelog

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-04-07 | 0.1.0 | Initial manifesto created from spec | Cloud Agent |
| 2026-04-07 | 0.1.1 | Architecture rewritten: app()-once + handle-based updates + HTML fragments | Owner decisions |
| 2026-04-07 | 0.1.2 | Layout system (shell+grid), CSS self-contained, plugin isolation, all decisions resolved | Owner decisions |
| 2026-04-07 | 0.1.3 | Full consistency audit: ComponentHandle rename, TableHandle+onRowClick, MetricHandle, TextHandle, STREAM_ERROR, hot reload preservation model | Owner decisions |
| 2026-04-07 | 0.1.4 | All Phase 3 decisions resolved: lazy loading, no session persistence, parameterPanel custom schema, multi-page deferred | Owner decisions |
| 2026-04-08 | 0.1.5 | Phase 1 implementation kickoff: status moved to In Progress, monorepo/package structure now active | Cloud Agent |
| 2026-04-08 | 0.1.6 | HTTP server: default port **3500**, EADDRINUSE port hop (up to 64 tries), `/style.css` resolves theme from package or `LASTRIKO_THEME_CSS`, request handler errors return 500 without crashing the process | Cloud Agent |
| 2026-04-08 | 0.1.7 | Foundation milestone complete: roadmap marks MVP Components as active; §8 project structure reflects implemented monorepo; tests run after build; CI workflow added | Cloud Agent |
| 2026-04-08 | 0.1.8 | Retired standalone PHASE-1.md; foundation summary and pre–Phase 2 decision status consolidated under §11; removed manifest §19 | Cloud Agent |
| 2026-04-08 | 0.1.9 | §11.1 Phase 2 line-count aligned with PHASE-2 (60 lines); §14 + docs/TESTING.md: Vitest, integration naming, CI matrix (Node + Bun) | Cloud Agent |
| 2026-04-08 | 0.1.10 | Node.js baseline **22+**; CI matrix Node **22 / 24 / 26** (npm) + Bun on Node 22; `engines` on root + `lastriko` package | Cloud Agent |
| 2026-04-08 | 0.1.11 | CI matrix Node **22 / 24** only (26 not yet on runners); `examples/component-gallery` replaces phase1-smoke; export `TableRow` type | Cloud Agent |

> **When updating:** Add a row to this table for every meaningful change to this document. Include what section changed and why.

---

## 1. Executive Summary

Lastriko is an open-source npm module that enables developers to build polished demo UIs for AI models, prototypes, and interactive showcases in minutes rather than hours. It occupies the same conceptual space as Streamlit but is designed from the ground up for the TypeScript/JavaScript ecosystem, with Bun as the primary runtime and Node.js as a fallback.

**Vision:** The fastest path from "I have an AI model" to "Here's a working, shareable demo."

### 1.1 Why Lastriko Exists

Streamlit proved that a declarative, script-to-UI paradigm is incredibly powerful for prototyping. However, its Python-only nature locks out the massive TypeScript/JavaScript ecosystem. Existing JS alternatives like Backroad are incomplete or abandoned. Meanwhile, the AI landscape in 2026 demands a tool that can render image outputs, video generations, streaming text, side-by-side model comparisons, and interactive parameter controls with zero frontend expertise required from the developer.

### 1.2 Core Principles

| # | Principle | Description |
|---|-----------|-------------|
| 1 | **Zero-config start** | One import, one function call, a running UI. |
| 2 | **Minimal dependencies** | Core ships under 50KB gzipped. Self-contained `lastriko.css` (~8KB). Reactivity via Nanostores (~1KB, server-only). |
| 3 | **TypeScript-first** | Full type inference, autocomplete, and compile-time safety for every component. |
| 4 | **Bun-native, Node-compatible** | Optimized for Bun (52K req/s, 5ms startup), but runs on **Node.js 22+** with no code changes. |
| 5 | **Plugin architecture** | LLM connectors, media renderers, and export targets are plugins, not core dependencies. |
| 6 | **Desktop-exportable** | Architecture designed to work inside Neutralino.js for lightweight desktop distribution (~2MB binary). |
| 7 | **Tests are not optional** | Every piece of code ships with tests. No PR merges without passing tests. Coverage gates are enforced in CI. This is how the framework earns the right to be extended. |

---

## 2. Architecture Overview

> Detailed breakdown: [docs/architecture/ENGINE.md](docs/architecture/ENGINE.md)

### 2.1 High-Level Diagram

```
[Developer Script]  →  [Lastriko Core Engine]  →  [Browser UI]
     .ts file           Server + Component State    WebSocket + HTML
                              |
                   [HTML Fragment Renderer]
                   Server renders component HTML,
                   pushes targeted fragments to client
                              |
                     [Plugin Registry]
                     /       |       \
              [LLM]    [Media]    [Export]
```

### 2.2 Execution Model

Lastriko uses a **declare-once, update-by-handle** model. This is the most important architectural decision in the project.

**`app()` runs once per connection.** When a client connects, the engine calls the developer's `app()` callback exactly once. This call declares the component tree — registering every component, setting up button bindings, and starting any background watchers. The resulting HTML is rendered and sent to the client.

**Button callbacks are bound handlers.** Buttons are not re-declarations of the component tree — they are isolated async callbacks that run when clicked. They execute independently, cannot redeclare existing components, and communicate results back by calling `.update()` on component handles.

**Components are mutable handles.** Every `ui.*` call returns a handle object. That handle can be held in a variable and mutated at any time — from inside a button callback, or from a background process — by calling `.update(data)`. Each update causes the server to re-render that specific component's HTML and push it as a fragment over the WebSocket.

**The client does targeted swaps.** The browser receives an HTML fragment tagged with a component ID and does a single `outerHTML` swap. No diffing, no virtual DOM, no client-side framework.

```typescript
import { app } from 'lastriko';

app('Experiments', (ui) => {
  // Declared ONCE — these components exist for the life of the connection
  const queue = ui.table('Experiment Queue', { columns: ['Name', 'Status', 'Result'] });

  ui.button('Run Experiment', async (btn) => {
    btn.setLoading(true);                           // Lock the button

    const row = queue.prepend({                     // Add placeholder immediately
      name: 'exp-42', status: 'queued', result: '—'
    });

    const job = runExperiment();
    job.onProgress((p) => row.update({ status: `running ${p}%` }));

    const result = await job;
    row.update({ status: 'complete', result: result.summary });
    btn.setLoading(false);                          // Unlock the button
  });

  // Background watcher — pushes updates independently of any button
  const gpuMetric = ui.metric('GPU Usage', '0%');
  watchGPU((usage) => gpuMetric.update(usage + '%'));
});
```

### 2.3 Layer Breakdown

**Layer 1: Developer Script (User Space)**

The developer writes a single TypeScript file. The `app()` callback runs once to declare the component tree. Button `onClick` callbacks and background watchers hold component handles and push updates imperatively.

**Layer 2: Core Engine (Server)**

Responsibilities:
- HTTP serving of the initial rendered HTML page
- WebSocket connection management (one scope per connection)
- Component registry: stores component definitions and their current rendered state
- HTML fragment rendering: when `.update()` is called, re-renders the component to HTML and sends it
- Dev-mode file watching and hot reload
- Plugin lifecycle management

**Layer 3: Browser UI (Client)**

An extremely lightweight client. Responsibilities:
- Establish and maintain the WebSocket connection
- On `RENDER` message: replace the full page body with the initial HTML
- On `FRAGMENT` message: find the element by ID, replace its `outerHTML`
- On `TOAST` message: display notification
- On `THEME` message: toggle `data-theme` on `<html>`
- Send `EVENT` messages on user interactions (button clicks, input changes)

No framework. No diffing. No virtual DOM. The client bundle target of **< 15KB gzip** is achievable with this model.

### 2.4 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Bun 1.1+ (primary), Node.js 22+ | Bun: 4x startup, native TS, built-in server. Node: ecosystem compat. |
| HTTP Server | `Bun.serve()` / Node `http` module | Zero-dependency server. No Express, no Hono needed. |
| WebSocket | Bun native WS / `ws` package (Node) | Bidirectional: client sends events, server pushes HTML fragments. |
| State (server) | Nanostores (~286 bytes) | Per-connection atom store. Server-only — client has no state library. |
| State (client) | None | Client is a pure display layer. `outerHTML` swap on `FRAGMENT` messages. |
| CSS | Lastriko CSS (~8KB, self-contained) | Hand-crafted, no CDN dependency, works offline, full design control. |
| Client JS | Vanilla TS, compiled to ES2022 | No framework. WS manager + HTML swapper. < 15KB gzip target. |
| Build/Bundle | Bun bundler (`bun build`) | Zero-config bundling built into the runtime. |
| Monorepo | Turborepo + Bun workspaces | Build caching, pipeline ordering, plugin package isolation. |
| Desktop Export | Neutralino.js v6.4+ | ~2MB binary vs Electron's ~150MB. Uses system webview. |

---

## 3. Core Engine Specification

> Detailed breakdown: [docs/architecture/ENGINE.md](docs/architecture/ENGINE.md)
> Protocol spec: [docs/architecture/PROTOCOL.md](docs/architecture/PROTOCOL.md)
> State management: [docs/architecture/STATE.md](docs/architecture/STATE.md)

### 3.1 App Lifecycle

| Stage | Name | Description |
|-------|------|-------------|
| 1 | **Bootstrap** | Parse CLI args, load `lastriko.config.ts` if present, initialize plugin registry, call `setup()` on all plugins. |
| 2 | **Server Start** | Launch HTTP server on port (default **3500**). If the port is in use (`EADDRINUSE`), try the next port up to 64 times. Serve the initial HTML shell. Open WebSocket endpoint at `/ws`. Dev mode only: start file watcher. Theme CSS for `GET /style.css` is resolved from the installed package, monorepo layout under `cwd`, or `LASTRIKO_THEME_CSS`; missing file yields HTTP 500, not a process crash. |
| 3 | **Connection** | New WebSocket client connects. Engine creates a `ConnectionScope` (isolated state). Calls `app()` callback once for this connection. Renders full component tree to HTML. Sends `RENDER` message with the full HTML page body. |
| 4 | **Runtime Loop** | Client sends `EVENT` messages (button clicks, input changes). Engine dispatches to the bound handler for that component. Handler calls `.update()` on handles. Engine re-renders those specific components and sends `FRAGMENT` messages. |
| 5 | **Disconnect** | WebSocket closes. `ConnectionScope` is destroyed — all atoms, handles, and background callbacks are garbage collected. |
| 6 | **Shutdown** | SIGINT/SIGTERM received. All connections closed gracefully. Plugin `teardown()` called. Process exits. |

### 3.2 Component Model

Every UI element in Lastriko is a **ComponentHandle** — an object that combines current state with mutation methods.

```typescript
interface ComponentHandle<TProps, TValue = void> {
  readonly id: string;               // Stable ID, assigned at declaration time
  readonly type: string;             // 'textInput' | 'slider' | 'button' | 'table' | ...
  props: TProps;                     // Current configuration
  value: TValue;                     // Current value (for input components)
  update(data: Partial<TProps & { value: TValue }>): void;  // Re-render and push fragment
}

// Input components also have .value (readable, driven by client events)
interface InputHandle<TValue> extends ComponentHandle<any, TValue> {
  value: TValue;  // Updated when client sends EVENT for this component
}

// Table has row management and event methods
interface TableHandle extends ComponentHandle<TableProps> {
  append(row: Record<string, any>): RowHandle;
  prepend(row: Record<string, any>): RowHandle;
  remove(rowId: string): void;
  rowCount: number;
  onRowClick(handler: (row: Record<string, any>) => void): void;
}

interface RowHandle {
  id: string;
  update(data: Partial<Record<string, any>>): void;
  remove(): void;
}

// Button handle passed to onClick callback
interface ButtonCallbackHandle {
  setLoading(loading: boolean): void;
}
```

### 3.3 Communication Protocol

> Full spec: [docs/architecture/PROTOCOL.md](docs/architecture/PROTOCOL.md)

Lastriko uses a simple protocol over WebSocket. The key design decision: **the server sends HTML, not JSON data structures**. The client is a thin HTML swap layer.

**Server → Client Messages**

| Type | Payload | Purpose |
|------|---------|---------|
| `RENDER` | `{ html: string }` | Full page body HTML — sent once on connection |
| `FRAGMENT` | `{ id: string, html: string }` | Single component re-render — targeted `outerHTML` swap |
| `THEME` | `{ mode: 'light' \| 'dark' }` | Theme switch — toggles `data-theme` on `<html>` |
| `TOAST` | `{ message: string, type: 'info'\|'success'\|'warning'\|'error', duration?: number }` | Non-blocking notification |
| `NAVIGATE` | `{ page: string }` | Switch page — server sends `FRAGMENT` for main content area |
| `ERROR` | `{ message: string, stack?: string }` | Unhandled error in `app()` — show error overlay |
| `STREAM_CHUNK` | `{ id: string, chunk: string, done: boolean }` | Streaming text append (for `streamText` component) |
| `STREAM_ERROR` | `{ id: string, error: string }` | Stream failed mid-flight — show error in the `streamText` component |

**Client → Server Messages**

| Type | Payload | Purpose |
|------|---------|---------|
| `READY` | `{ viewport: { width, height }, theme: string \| null }` | Client loaded, request initial render |
| `EVENT` | `{ id: string, event: 'click'\|'change'\|'blur', value?: any }` | User interaction |
| `RESIZE` | `{ width: number, height: number }` | Viewport changed |
| `THEME_CHANGE` | `{ mode: 'light' \| 'dark' }` | User toggled theme in toolbar |

### 3.4 State Management

> Full spec: [docs/architecture/STATE.md](docs/architecture/STATE.md)

Each WebSocket connection gets its own `ConnectionScope` containing all Nanostores atoms for that connection. When a client sends an `EVENT` (e.g., slider drag), the engine updates the corresponding atom. The new value is available via `handle.value` the next time the button callback or watcher reads it.

**Nanostores is used only on the server.** The client has no state library — it is purely a display layer. This is a fundamental change from the original spec which planned Nanostores on both server and client.

**State lifetime:** Created on connection, destroyed on disconnect. No persistence between sessions by default (Phase 3 adds opt-in `localStorage` persistence for input values).

### 3.5 Hot Reload

File watcher runs in dev mode only. On script change:

1. All active connections receive a `TOAST` ("Reloading...")
2. Client snapshots preservable state (see below) before the reload arrives
3. Module cache invalidated for the changed file
4. `app()` callback re-imported and re-called for each active connection
5. Fresh `RENDER` sent to each client — full page body replaced
6. Client restores preserved state into the new component tree by matching stable component IDs

**State preservation (Phase 3 feature, opt-in via config):**

```typescript
// lastriko.config.ts
export default defineConfig({
  hotReloadPreserve: true,  // Default: true in Phase 3+
})
```

When `hotReloadPreserve` is enabled, the following are saved client-side before hot reload and restored into the new tree if the same component ID exists:

| What | How |
|------|-----|
| Input values (`textInput`, `numberInput`, `slider`, `toggle`, `select`) | Stored in `sessionStorage` keyed by component ID |
| Scroll position | `window.scrollY` + per-scrollable-container scroll offset |
| Active tab in `ui.tabs()` | Active tab label stored by tabs component ID |

**What is NOT preserved (always resets on hot reload):**
- `streamText` content — streams are considered transient
- `table` rows appended at runtime — runtime data is not a form value
- `chatUI` history — managed separately (connection-scoped atom, which itself resets on full WS reconnect)
- Any state that cannot be trivially represented as a serialisable value

**Through Phase 2:** `hotReloadPreserve` does not exist yet — hot reload always resets everything. Phase 3 adds this feature.

The dev experience (Phase 3+): save file → browser updates in < 100ms, input values and scroll position restored.

---

## 4. Component Library

> Full specs:
> - [docs/components/INPUTS.md](docs/components/INPUTS.md)
> - [docs/components/DISPLAY.md](docs/components/DISPLAY.md)
> - [docs/components/LAYOUT.md](docs/components/LAYOUT.md)
> - [docs/components/FEEDBACK.md](docs/components/FEEDBACK.md)
> - [docs/components/AI.md](docs/components/AI.md)

The philosophy: **simple, beautiful defaults with just enough customization.** All component HTML is rendered server-side and styled by Lastriko's self-contained CSS.

### 4.1 Input Components

All input components return a `ComponentHandle` whose `.value` is updated when the user interacts, and whose `.update()` re-renders that component as an HTML fragment.

| Component | Returns | Renders As | Phase |
|-----------|---------|------------|-------|
| `button` | `ButtonHandle` | `<button>` with loading state | 2 |
| `textInput` | `InputHandle<string>` | `<input type="text">` or `<textarea>` | 2 |
| `numberInput` | `InputHandle<number>` | `<input type="number">` | 2 |
| `slider` | `InputHandle<number>` | `<input type="range">` + value display | 2 |
| `toggle` | `InputHandle<boolean>` | CSS switch (not bare checkbox) | 2 |
| `select` | `InputHandle<string>` | `<select>` dropdown | 2 |
| `fileUpload` | `InputHandle<UploadedFile \| null>` | `<input type="file">` with drag-drop zone | 2 |
| `multiSelect` | `InputHandle<string[]>` | Checkbox group | 3 |
| `colorPicker` | `InputHandle<string>` | `<input type="color">` + hex display | 3 |
| `dateInput` | `InputHandle<string>` | `<input type="date">` | 3 |

### 4.2 Display Components

Display components whose content changes after initial render return a `ComponentHandle` with `.update()`. Static-only display components return `void`.

| Component | Returns | Description | Phase |
|-----------|---------|-------------|-------|
| `text` | `TextHandle` | Plain text / inline Markdown. `.update(content)` pushes a `FRAGMENT`. | 2 |
| `markdown` | `void` | Full Markdown prose block — server-rendered via `marked` | 2 |
| `image` | `ImageHandle` | Image with optional caption, zoom, download | 2 |
| `imageGrid` | `void` | Responsive grid of images | 2 |
| `code` | `CodeHandle` | Syntax-highlighted (shiki, server-side) code block + copy button | 2 |
| `json` | `JsonHandle` | Collapsible JSON tree | 2 |
| `table` | `TableHandle` | Data table with `.append()`, `.prepend()`, `.remove()`, row `.update()` | 2 |
| `metric` | `MetricHandle` | KPI card. `.update(value, opts?)` pushes a `FRAGMENT`. | 2 |
| `progress` | `ProgressHandle` | Progress bar (0–100) or indeterminate spinner (null) | 2 |
| `video` | `void` | HTML5 video player | 3 |
| `audio` | `void` | HTML5 audio player | 3 |
| `diff` | `void` | Side-by-side or inline text diff | 3 |

### 4.3 Layout Components

The layout system uses two primitives — `shell` for page structure and `grid` for content splitting. This covers all use cases for lab-testing and AI demo UIs without requiring CSS knowledge.

> Full spec: [docs/components/LAYOUT.md](docs/components/LAYOUT.md)

| Component | Purpose | Phase |
|-----------|---------|-------|
| `shell(regions, opts?)` | Page structure: header, sidebar (left/right), main, footer. Only declared regions render. | 2 |
| `grid(areas[], opts?)` | Splits a region into rows/columns. Accepts equal count or explicit CSS track sizes. | 2 |
| `tabs(tabs[], opts?)` | Switches content sets within a region. Not top-level navigation. | 2 |
| `card(title?, content)` | Visually groups related components. Lives inside grid cells or regions. | 2 |
| `divider(opts?)` | Horizontal separator with optional label. | 2 |
| `spacer(size?)` | Vertical whitespace: `'sm'`=8px, `'md'`=16px, `'lg'`=32px. | 2 |
| `accordion(sections[], opts?)` | Expandable/collapsible sections. | 3 |
| `fullscreen(content, opts?)` | Modal overlay. | 3 |

**Key design decisions:**
- `shell()` regions accept free placement of any component — buttons, metrics, selects all work in header/footer/sidebar
- Handle references cross region boundaries — a handle declared in `header` can be updated from a `main` button callback
- Sidebar can be `'left'` or `'right'` (configurable per shell)
- Mobile: sidebar collapses to hamburger drawer at `< 768px`
- `grid()` without explicit sizes uses CSS `auto-fit minmax` — responsive by default

### 4.4 Feedback Components

| Component | API Signature | Description | Phase |
|-----------|--------------|-------------|-------|
| `toast` | `toast(message, { type?, duration? })` | Non-blocking notification popup | 2 |
| `alert` | `alert(message, type?)` | Inline alert banner (info/success/warning/error) | 2 |
| `loading` | `loading(message?)` | Full-page or inline loading spinner | 2 |
| `streamText` | `streamText(opts?)` → `StreamHandle` | Token streaming display. Call `.append(chunk)` to push text. Sends `STREAM_CHUNK` fragments. | 2 |

### 4.5 AI-Specific Components

| Component | API Signature | Description | Phase |
|-----------|--------------|-------------|-------|
| `chatUI` | `chatUI(opts?)` | Chat interface with message history, typing indicator | 2 |
| `modelCompare` | `modelCompare(models[], opts?)` | Side-by-side output comparison for N models | 3 |
| `promptEditor` | `promptEditor(opts?)` | Multi-line prompt input with variable highlighting | 2 |
| `parameterPanel` | `parameterPanel(params)` | Auto-generated controls from a parameter schema | 3 |
| `filmStrip` | `filmStrip(images[], opts?)` | Horizontal scrollable image strip with thumbnails | 3 |
| `beforeAfter` | `beforeAfter(imageBefore, imageAfter)` | Slider comparison of two images | 3 |

---

## 5. Theming System

> Full spec: [docs/THEMING.md](docs/THEMING.md)

### 5.1 Approach

Lastriko's theming is built on two layers delivered through a single self-contained `lastriko.css` file:
1. **CSS custom properties** (`--lk-*` tokens) on `:root` and `[data-theme="dark"]` — define all colors, spacing, typography, and radii.
2. **Developer overrides** — a `theme.tokens` object in `defineConfig()` injects an additional `<style>` block that overrides any token.

### 5.2 Theme Tokens

| Token | Light Default | Dark Default | Purpose |
|-------|--------------|-------------|---------|
| `--lk-bg` | `#ffffff` | `#1a1a2e` | Page background |
| `--lk-surface` | `#f8f9fa` | `#16213e` | Card/container background |
| `--lk-text` | `#111827` | `#e2e8f0` | Primary text color |
| `--lk-accent` | `#e94560` | `#e94560` | Buttons, links, highlights |
| `--lk-border` | `#d1d5db` | `#2d3748` | Component borders |
| `--lk-input-bg` | `#ffffff` | `#0f3460` | Input field background |
| `--lk-success` | `#10b981` | `#34d399` | Success states |
| `--lk-error` | `#ef4444` | `#f87171` | Error states |
| `--lk-warning` | `#f59e0b` | `#fbbf24` | Warning states |
| `--lk-radius` | `8px` | `8px` | Border radius |
| `--lk-font` | `system-ui, sans-serif` | `system-ui, sans-serif` | Font stack |
| `--lk-font-mono` | `ui-monospace, monospace` | `ui-monospace, monospace` | Code font stack |

### 5.3 Theme Switching

Theme switching is instantaneous (CSS-only, no re-render) and can be triggered:
- **Programmatically:** `ui.setTheme('dark')` or `ui.setTheme('light')`
- **Automatically:** via system preference detection (default)
- **By user:** via a built-in toggle in the Lastriko toolbar

---

## 6. Plugin System

> Full spec: [docs/architecture/PLUGIN-SYSTEM.md](docs/architecture/PLUGIN-SYSTEM.md)

### 6.1 Isolation Rule

**Plugins are fully isolated from each other.** This is a hard architectural constraint:

- A plugin's only allowed dependency is the `lastriko` core package
- No plugin may `import` from another plugin
- No plugin may have another plugin as a `peerDependency` or `dependency`
- If two plugins need shared functionality, that functionality must live in core (`PluginContext`)

This rule exists to prevent version conflicts, circular dependency chains, and unpredictable load ordering. The `PluginContext` API is explicitly designed to be complete enough that plugins never need to reach across to each other.

### 6.2 Architecture

A plugin is a plain object implementing the `LastrikoPlugin` interface:

```typescript
interface LastrikoPlugin {
  name: string;
  version: string;
  setup(ctx: PluginContext): void | Promise<void>;
  teardown?(): void | Promise<void>;
}

interface PluginContext {
  registerComponent(name: string, renderer: ComponentRenderer): void;
  registerRoute(path: string, handler: RouteHandler): void;
  registerMiddleware(fn: Middleware): void;
  getStore<T>(key: string): WritableAtom<T>;
  config: Record<string, any>;
  logger: Logger;
}
```

### 6.3 Official Plugins

**LLM Connectors**

| Package | Provider | Phase |
|---------|----------|-------|
| `@lastriko/plugin-openai` | OpenAI API (GPT-4o, DALL-E, etc.) | 4 |
| `@lastriko/plugin-anthropic` | Anthropic API (Claude models) | 4 |
| `@lastriko/plugin-ollama` | Local Ollama models | 4 |
| `@lastriko/plugin-huggingface` | HuggingFace Inference API — stretch goal, ships in Phase 4 or 5 | 4–5 |
| `@lastriko/plugin-replicate` | Replicate hosted models — stretch goal, ships in Phase 4 or 5 | 4–5 |
| `@lastriko/plugin-generic-llm` | Any OpenAI-compatible endpoint | 4 |

**Media Plugins**

| Package | Description | Phase |
|---------|-------------|-------|
| `@lastriko/plugin-image-gen` | Unified image generation (DALL-E, SD, Midjourney API) | 4 |
| `@lastriko/plugin-video-gen` | Video generation output renderer | 5 |
| `@lastriko/plugin-audio` | TTS and audio playback | 4 |
| `@lastriko/plugin-3d` | Three.js-based 3D model viewer | 5 |

**Export Plugins**

| Package | Description | Phase |
|---------|-------------|-------|
| `@lastriko/plugin-neutralino` | Desktop export via Neutralino.js — stub ships in Phase 4 to unblock Phase 5; full implementation in Phase 5 | 4 (stub) / 5 (full) |
| `@lastriko/plugin-static` | Export as static HTML (no server needed) | 5 |
| `@lastriko/plugin-docker` | Auto-generate Dockerfile for deployment | 5 |
| `@lastriko/plugin-share` | Generate shareable link (tunneling) | 5 |

**Utility Plugins**

| Package | Description | Phase |
|---------|-------------|-------|
| `@lastriko/plugin-auth` | Basic auth / API key gating for demos | 4 |
| `@lastriko/plugin-analytics` | Usage tracking for demo sessions | 6 |
| `@lastriko/plugin-i18n` | Internationalization support | 6 |

### 6.4 Plugin Usage Example

```typescript
import { app } from 'lastriko';
import { openai } from '@lastriko/plugin-openai';
import { neutralino } from '@lastriko/plugin-neutralino';

app('My Demo', {
  plugins: [
    openai({ apiKey: process.env.OPENAI_API_KEY }),
    neutralino(),
  ],
}, async (ui) => {
  const chat = ui.chatUI({ model: 'gpt-4o' });
});
```

---

## 7. Desktop Export — Neutralino.js Integration

### 7.1 Why Neutralino

Neutralino.js produces ~2MB runtime binaries compared to Electron's ~150MB (which bundles Chromium). It uses the system's native webview instead. The total Lastriko desktop export — Neutralino binary + compiled server + bundled client assets — targets **< 10MB per platform** (the performance target in §13). The `~5MB` figure cited in examples reflects a typical simple demo; the `< 10MB` cap is the hard limit enforced by CI.

### 7.2 Export Flow

```
bunx lastriko export --desktop
       ↓
1. Bundle client assets → static HTML/JS/CSS
2. Compile server logic → standalone Bun executable (bun build --compile)
3. Neutralino wraps static assets with a native window shell
4. Output: distributable folder per platform (~5MB total)
```

### 7.3 Desktop-Specific APIs

Available through `@lastriko/plugin-neutralino`, gracefully degrading to no-ops in browser mode:
- Native file dialogs (open/save)
- System notifications
- Clipboard access
- Window management (minimize, maximize, fullscreen)
- System tray integration

---

## 8. Project Structure

> **Note:** The layout below matches the implemented monorepo. Plugin packages and some `tests/` subtrees are added in later roadmap phases.

**Monorepo structure:**

```
lastriko/
├── packages/
│   ├── core/                  # Main npm package: 'lastriko'
│   │   ├── src/
│   │   │   ├── engine/        # Server, WebSocket, lifecycle
│   │   │   ├── components/    # Component handles + renderers
│   │   │   ├── client/        # Browser-side bundle (WS + outerHTML swap)
│   │   │   ├── theme/         # lastriko.css — self-contained stylesheet
│   │   │   ├── plugins/       # Plugin system interfaces + registry
│   │   │   ├── utils/         # Shared helpers
│   │   │   └── index.ts       # Public API exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── plugin-openai/         # @lastriko/plugin-openai  (Phase 4)
│   ├── plugin-anthropic/      # @lastriko/plugin-anthropic  (Phase 4)
│   ├── plugin-neutralino/     # @lastriko/plugin-neutralino  (Phase 5)
│   └── create-lastriko/       # CLI scaffolding tool
├── examples/
│   ├── component-gallery/     # Phase 1–2 component showcase (shell, inputs, AI widgets)
│   ├── image-viewer/          # Simple image review demo
│   └── experiment-monitor/    # Complex ML dashboard demo
├── tests/
│   ├── e2e/                   # Playwright E2E tests
│   └── visual/                # Playwright visual regression tests
├── docs/                      # This documentation set
├── turbo.json                 # Turborepo config
├── package.json               # Workspace root
└── LICENSE

```

The project uses a monorepo managed by Turborepo with Bun workspaces. Each plugin is a separate publishable package under the `@lastriko` scope.

---

## 9. Developer Experience

### 9.1 Getting Started

```bash
# Scaffold a new project
bunx create-lastriko my-demo
cd my-demo

# Start development (hot reload enabled)
bun run dev

# Or with Node.js
npx create-lastriko my-demo
npm run dev
```

### 9.2 Minimal Example

No shell needed for simple demos — components render top-to-bottom in the main area:

```typescript
// demo.ts
import { app } from 'lastriko';

app('Hello Lastriko', (ui) => {
  const name     = ui.textInput('Your name')
  const greeting = ui.text('Hello, stranger!')   // text() returns TextHandle

  ui.button('Greet', () => {
    greeting.update(`Hello, ${name.value || 'stranger'}!`)
  })
})
```

With a shell for a structured lab UI:

```typescript
app('Experiment Lab', (ui) => {
  ui.shell({
    header: (h) => {
      h.text('**Experiment Lab**')
      const runCount = h.metric('Runs', 0)
    },
    sidebar: (s) => {
      const model = s.select('Model', ['gpt-4o', 'claude-3.5'])
      const temp  = s.slider('Temperature', { min: 0, max: 2, default: 0.7 })
    },
    main: (m) => {
      const queue = m.table('Queue', { columns: ['Name', 'Status', 'Score'] })

      m.button('Run experiment', async (btn) => {
        btn.setLoading(true)
        const row = queue.prepend({ name: 'exp-1', status: 'queued', score: '—' })
        const result = await runExperiment(model.value, temp.value)
        row.update({ status: 'done', score: result.score })
        runCount.update(String(queue.rowCount))
        btn.setLoading(false)
      })
    },
  })
})
```

### 9.3 Configuration

Optional `lastriko.config.ts` for project-wide settings:

```typescript
import { defineConfig } from 'lastriko';

export default defineConfig({
  port: 3500,
  theme: 'dark',          // 'light' | 'dark' | 'auto'
  title: 'My AI Demo',
  favicon: './favicon.png',
  plugins: [],
  toolbar: true,          // Show/hide Lastriko toolbar
  openBrowser: true,      // Auto-open on start
});
```

### 9.4 CLI Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server with hot reload |
| `bun run build` | Bundle for production |
| `bun run export --static` | Export as static HTML |
| `bun run export --desktop` | Export as Neutralino desktop app |
| `bun run export --docker` | Generate Dockerfile |

---

## 10. Dependency Philosophy

> **Rule:** Every new production dependency must be listed and approved in this section before it can be added to any `package.json`. Adding an unlisted dependency is a manifesto violation.

### 10.1 Plugin Isolation Rule

**Plugins must not depend on each other.** The only allowed inter-package dependency is `plugin → core`. Never `plugin → plugin`.

```
✅ @lastriko/plugin-openai → lastriko (core)
✅ @lastriko/plugin-anthropic → lastriko (core)
❌ @lastriko/plugin-openai → @lastriko/plugin-anthropic
```

If two plugins need shared behaviour, that behaviour belongs in core (`PluginContext`), not in a shared plugin. This prevents:
- Circular dependencies
- Version lock conflicts between plugin pairs
- Unpredictable loading order
- Plugins silently breaking when another plugin updates

### 10.2 Production Dependencies — Core Package

| Package | Size (gzip) | Purpose | Replaceable? |
|---------|------------|---------|-------------|
| `nanostores` | ~286 bytes | Server-side reactive state atoms per connection | No — core to architecture |
| `ws` (Node only) | ~3KB | WebSocket server for Node.js fallback | Not needed on Bun |

**No CSS framework dependency.** Lastriko ships its own `lastriko.css` (~8KB uncompressed, ~2KB gzip). No CDN, no Pico.css, no external CSS.

Total production dependency footprint for core: **< 5KB gzip** (server-side only).
- Core server module target: **≤ 35KB gzip**
- Client bundle target: **≤ 15KB gzip**
- Lastriko CSS target: **≤ 10KB uncompressed**

### 10.3 Development Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | Type checking (Bun handles transpilation natively) |
| `bun-types` | Bun API type definitions |
| `vitest` | Test runner (same suite under `npm run test` and `bun run test`) |
| `turborepo` | Monorepo build orchestration + caching |
| `changesets` | Version management and changelog generation |
| `prettier` | Code formatting |
| `eslint` + `@antfu/eslint-config` | Linting |

### 10.4 Plugin Dependencies

Each plugin package manages its own dependencies. Examples:

| Plugin | Its dependencies |
|--------|----------------|
| `@lastriko/plugin-openai` | `openai` (official SDK) |
| `@lastriko/plugin-anthropic` | `@anthropic-ai/sdk` |
| `@lastriko/plugin-ollama` | `ollama` or direct HTTP |

Plugin dependencies must not appear in the core package. The core never `import`s from any plugin.

---

## 11. Development Phases & Roadmap

> Detailed phase docs:
> - [docs/phases/PHASE-2.md](docs/phases/PHASE-2.md)
> - [docs/phases/PHASE-3.md](docs/phases/PHASE-3.md)
> - [docs/phases/PHASE-4.md](docs/phases/PHASE-4.md)
> - [docs/phases/PHASE-5.md](docs/phases/PHASE-5.md)
> - [docs/phases/PHASE-6.md](docs/phases/PHASE-6.md)

Each phase produces a usable, publishable npm package. **Ship early, iterate fast.**

| Phase | Name | Key Deliverable | Status |
|-------|------|----------------|--------|
| 1 | Infrastructure & Foundation | Working skeleton: serve a page, sync state, render basic components | Complete |
| 2 | MVP Components | v0.1.0: enough components to build a real AI demo | In Progress |
| 3 | Advanced Components & Polish | Feature parity with full component table | Not Started |
| 4 | Plugin Ecosystem | First official plugins (OpenAI, Anthropic, Ollama, Neutralino) | Not Started |
| 5 | Desktop & Distribution | One-command desktop export, static export, Docker | Not Started |
| 6 | Ecosystem & Community | Templates gallery, community plugins, Lastriko Cloud concept | Not Started |

### 11.1 Foundation milestone (complete)

**Phase 1 — Infrastructure & Foundation** is done. The codebase includes: npm workspaces + Turborepo; `lastriko` core with HTTP server (default port **3500**, hop on `EADDRINUSE`), WebSocket at `/ws`, and `app()` invoked once per connection with per-connection scope; `ui.text` / `ui.button` handles, HTML renderer with escaping, client bundle (`outerHTML` swaps, reconnect); self-contained `lastriko.css` at `/style.css`; plugin **types** and registry stubs; `create-lastriko` scaffold. Behaviour and protocol are specified in [§3](#3-core-engine-specification), [§8](#8-project-structure), [ENGINE.md](docs/architecture/ENGINE.md), and [PROTOCOL.md](docs/architecture/PROTOCOL.md).

**Before Phase 2 (MVP Components):** There are **no unresolved design questions** blocking implementation. Locked decisions through early MVP scope are summarized in [`.cursor/rules/open-questions-check.mdc`](.cursor/rules/open-questions-check.mdc). If a new fork appears (for example, choosing between two libraries), resolve it in the relevant `docs/` spec and add a row to the [changelog](#changelog) **before** writing code.

**Phase 2 Exit Criteria:** A developer can build and share a working AI chat demo with streaming output, image display, parameter controls, and dark mode in under 60 lines of code (see [PHASE-2.md](docs/phases/PHASE-2.md#exit-criteria)).

---

## 12. API Design Principles

### 12.1 Declare Once, Update by Handle

The developer declares the full component structure once in `app()`. Subsequent changes happen through imperative handle calls, not re-declarations. This makes the code read like a script that sets up a live dashboard, not a render function that runs repeatedly.

```typescript
app('Demo', (ui) => {
  // DECLARE — runs once
  const modelSelect = ui.select('Model', ['gpt-4o', 'claude-3.5']);
  const tempSlider = ui.slider('Temperature', { min: 0, max: 2, default: 0.7 });
  const output = ui.streamText({ label: 'Output' });
  const latency = ui.metric('Latency', '—');

  // BIND — callback runs on each click
  ui.button('Generate', async (btn) => {
    btn.setLoading(true);
    const start = Date.now();

    const stream = await callModel(modelSelect.value, tempSlider.value);
    for await (const chunk of stream) {
      output.append(chunk);           // pushes STREAM_CHUNK fragment
    }

    latency.update(`${Date.now() - start}ms`);  // pushes FRAGMENT
    btn.setLoading(false);
  });
});
```

### 12.2 Convention Over Configuration

Every component has sensible defaults. A `textInput` with just a label works immediately. Configuration is progressive: you add options only when you need to deviate from defaults.

### 12.3 Server-Side Rendering, Client-Side Swapping

The server owns all rendering. When `.update()` is called on a handle, the server re-renders that component's HTML using the current props and pushes it as a targeted fragment. The client does one `outerHTML` swap — nothing more. This means:
- No client-side templating language to learn
- Component HTML can use any server-only library (Shiki for syntax highlighting, sharp for image processing, etc.)
- The client bundle stays minimal

### 12.4 Handles Are First-Class

Component handles are long-lived objects. They can be stored in variables, passed to helper functions, held by background processes, and updated at any time. The connection between a handle and its DOM node is maintained by the engine via stable IDs.

```typescript
// Handles can be used anywhere — not just inside app()
async function monitorExperiment(row: RowHandle, jobId: string) {
  const events = streamJobEvents(jobId);
  for await (const event of events) {
    row.update({ status: event.status, log: event.message });
  }
}
```

### 12.5 Fail Gracefully

- If a plugin is missing, the component it provides renders a helpful placeholder instead of crashing.
- If a WebSocket connection drops, the client automatically reconnects. The server calls `app()` again for the new connection — fresh state.
- If a button `onClick` throws an unhandled error, the engine sends a `TOAST` with `type: 'error'` and restores the button to normal state. The rest of the UI is unaffected. The `ERROR` message (full-page overlay) is reserved for failures in the initial `app()` render only.
- If an image URL fails to load, the image component shows a fallback with the error message.

---

## 13. Performance Targets

> **Rule:** These targets are contractual. Any change that causes a target to be missed must either update the target here (with justification and approval) or be revised before merging.

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Cold start (Bun) | < 50ms | Time from `bun demo.ts` to server listening |
| Cold start (Node) | < 200ms | Time from `node demo.ts` to server listening |
| First paint | < 100ms | Time from browser open to rendered UI |
| Component render | < 5ms | Time to render a single component update |
| WebSocket latency | < 10ms | Round-trip for input change to UI update |
| Client bundle size | < 15KB gzip | Total JS sent to browser (CSS served separately) |
| Core package size | < 50KB gzip | npm package install size |
| Memory (100 components) | < 30MB | Server memory with 100 active components |
| Desktop binary | < 10MB | Total export size: Neutralino runtime (~2MB) + compiled server + client bundle |

---

## 14. Testing Strategy

> Full spec: [docs/TESTING.md](docs/TESTING.md)
> Cursor rule: [`.cursor/rules/test-coverage.mdc`](.cursor/rules/test-coverage.mdc)

### 14.0 The Testing Contract

**Tests are the mechanism by which Lastriko earns the right to grow.**

This is a framework — developers will build on top of it. A bug in core breaks every demo built with it. A regression in the WebSocket protocol silently corrupts state for every user. A broken component renderer produces wrong HTML that is invisible until runtime.

The testing contract is:

> **Every new function, component, protocol message, or engine behaviour added to `packages/core` must have a corresponding test before the PR is merged. No exceptions.**

This applies equally to:
- New component types (unit test for renderer output)
- New WebSocket message types (integration test for send/receive)
- New handle methods (unit test + integration test)
- New plugin APIs (unit test for registration + integration test for lifecycle)
- Bug fixes (a regression test that would have caught the bug)
- Performance changes (benchmark test verifying the target is still met)

The rule is enforced by the `.cursor/rules/test-coverage.mdc` Cursor rule and by CI coverage gates.

### 14.1 Test Pyramid

| Level | Tool | Coverage Target | What It Tests |
|-------|------|----------------|---------------|
| Unit | Vitest | **90%+** | Component renderers, handle mutation, state atoms, HTML escaping, ID generation |
| Integration | Vitest + in-process WS client | **80%+** | READY→RENDER, EVENT→FRAGMENT, STREAM_CHUNK, file upload, hot reload |
| E2E | Playwright | All user-facing flows | Full demo in browser: shell, grid, table updates, streaming, theme toggle |
| Visual | Playwright screenshots | All components | Pixel-level regression for light + dark mode |
| Performance | Vitest / runtime benchmarks | Per target in §13 | Cold start, render time, bundle size, memory |

### 14.2 Coverage Gates (CI-enforced)

| Package | Line coverage | Branch coverage |
|---------|--------------|----------------|
| `packages/core/src/engine/` | ≥ 90% | ≥ 85% |
| `packages/core/src/components/` | ≥ 90% | ≥ 85% |
| `packages/core/src/client/` | ≥ 80% | ≥ 75% |
| `packages/plugin-*/src/` | ≥ 85% | ≥ 80% |

CI fails the PR if any gate is not met. Coverage is measured with Vitest (`vitest run --coverage`) when coverage is enabled for a job.

### 14.3 CI Pipeline

Every pull request must pass the **quality** matrix in [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. **Type check** — `npm run typecheck` / `bun run typecheck` (zero errors)
2. **Lint** — `npm run lint` / `bun run lint`
3. **Unit tests** — `npm run test` / `bun run test` (integration files excluded; see [docs/TESTING.md](docs/TESTING.md))
4. **Integration tests** — `npm run test:integration` / `bun run test:integration`
5. **Bundle size** — `check:bundle` — client ≤ 15KB gzip, core ≤ 50KB gzip (hard fail)

**Matrix:** Node.js **22 and 24** (npm), plus **Bun** on Node 22 (`npm ci` then `bun run` for the same scripts). Node 26 is omitted until it is available on CI runners. E2E and visual Playwright jobs are added in Phase 2 when those suites exist.

A PR that skips or disables any of these steps will not be merged.

### 14.4 Test Location Convention

Tests live next to the code they test:

```
packages/core/src/
├── engine/
│   ├── renderer.ts
│   ├── renderer.test.ts      ← unit tests for renderer
│   └── websocket.ts
│   └── websocket.test.ts
├── components/
│   ├── table.ts
│   └── table.test.ts
└── __tests__/
    └── integration/          ← integration tests (require a running server); use *.integration.test.ts
        └── ws-flow.integration.test.ts
```

E2E and visual tests live in `tests/` at the repo root.

---

## 15. Security Considerations

> Full spec: [docs/SECURITY.md](docs/SECURITY.md)

| Rule | Details |
|------|---------|
| Localhost-only by default | Servers bind to `localhost`. Exposing to `0.0.0.0` requires explicit `--host` flag. |
| File upload sandboxing | Uploads are sandboxed to a temporary directory and cleaned up on session end. |
| WebSocket validation | Messages validated against a strict schema. Malformed messages are dropped. |
| API key isolation | Plugin API keys are never sent to the client. All LLM calls happen server-side. |
| Static export | Static export mode strips all server code and produces a client-only bundle. |
| CSP headers | Content Security Policy headers set by default. |
| Rate limiting | WebSocket rate limiting at 100 msgs/sec by default (configurable). |

---

## 16. Licensing & Publishing

### 16.1 License

**MIT License** — maximizes adoption and contribution potential.

### 16.2 npm Package Names

| Package | npm Name | Scope |
|---------|----------|-------|
| Core | `lastriko` | Unscoped (primary entry point) |
| Create CLI | `create-lastriko` | Unscoped (for bunx/npx) |
| OpenAI Plugin | `@lastriko/plugin-openai` | Scoped |
| Anthropic Plugin | `@lastriko/plugin-anthropic` | Scoped |
| Ollama Plugin | `@lastriko/plugin-ollama` | Scoped |
| Neutralino Plugin | `@lastriko/plugin-neutralino` | Scoped |

### 16.3 Versioning

- SemVer with Changesets for automated changelog generation.
- Phases 1–3: versions `0.x.y` (API may change).
- Version `1.0.0` targeted after Phase 4 when the plugin API is stable.

---

## 17. Competitive Positioning

> Full analysis: [docs/COMPETITIVE.md](docs/COMPETITIVE.md)

| Feature | Lastriko | Streamlit | Gradio | Backroad |
|---------|----------|-----------|--------|---------|
| Language | TypeScript/JS | Python | Python | Node.js |
| Runtime | Bun / Node.js | Python | Python | Node.js |
| Bundle size | ~15KB client | ~2MB client | ~1.5MB client | ~500KB client |
| LLM streaming | Native | Via `st.write_stream` | Via `gr.Chatbot` | Basic |
| Desktop export | Neutralino (~5MB) | No | No | No |
| Theming | Light/Dark + tokens | Limited | Limited | None |
| Plugin system | First-class | Components only | Custom components | None |
| Type safety | Full TypeScript | Runtime typing | Runtime typing | Basic TS |
| AI-specific UI | ChatUI, Compare, etc. | Chat, limited | ChatBot, Gallery | None |
| Maintenance | Active (new) | Active | Active | Abandoned |

---

## 18. Success Metrics

| Phase Range | Metric | Target |
|-------------|--------|--------|
| Through Phase 2 | npm package published and installable | ✓ |
| Through Phase 2 | Working example projects in repo | 3 |
| Through Phase 2 | GitHub stars from external developers | 5+ |
| Through Phase 2 | Critical bugs in first week post-publish | 0 |
| Phase 3–4 | npm weekly downloads | 100+ |
| Phase 3–4 | GitHub stars | 50+ |
| Phase 3–4 | Community-contributed plugins or examples | 2+ |
| Phase 3–4 | Featured in JS newsletter or blog | 1+ |
| Phase 5–6 | npm weekly downloads | 500+ |
| Phase 5–6 | Desktop export used in real demos | 2+ |
| Phase 5–6 | Official plugins | 5+ |
| Phase 5–6 | Community plugins | 3+ |
| Phase 5–6 | GitHub stars | 1,000+ |

---

## Appendix A: Full API Quick Reference 

> Detailed API reference: [docs/API-REFERENCE.md](docs/API-REFERENCE.md)

```typescript
import {
  // Core
  app, defineConfig,
  
  // Input components
  button, textInput, numberInput, slider, toggle, select,
  multiSelect, colorPicker, fileUpload, dateInput,
  
  // Display components
  text, markdown, image, imageGrid, video, audio,
  code, json, table, metric, progress, diff,
  
  // Layout components
  shell, grid, tabs, accordion, fullscreen,
  card, divider, spacer,
  
  // Feedback components
  toast, alert, loading, streamText,
  
  // AI components
  chatUI, modelCompare, promptEditor,
  parameterPanel, filmStrip, beforeAfter,
  
  // Types
  type ComponentHandle, type InputHandle, type ButtonHandle,
  type TableHandle, type TableRow, type RowHandle, type TextHandle,
  type MetricHandle, type ProgressHandle, type StreamHandle,
  type LastrikoPlugin, type PluginContext, type UIContext,
  type ShellRegions, type ShellOpts, type GridOpts,
} from 'lastriko';
```

---

*End of Manifesto — LASTRIKO v0.1.11*
