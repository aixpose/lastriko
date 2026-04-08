# LASTRIKO

> **The TypeScript UI Toolkit for AI Demos & Rapid Prototyping**
>
> Version 0.1.8 — AIXPOSE OÜ

---

**Vision:** The fastest path from "I have an AI model" to "Here's a working, shareable demo."

Lastriko is an open-source npm module that enables developers to build polished demo UIs for AI models, prototypes, and interactive showcases in minutes rather than hours. Think Streamlit, but TypeScript-first, Bun-native, and built for the AI landscape of 2026.

```typescript
import { app } from 'lastriko'

app('My AI Demo', (ui) => {
  ui.shell({
    sidebar: (s) => {
      const model = s.select('Model', ['gpt-4o', 'claude-3.5'])
      const temp  = s.slider('Temperature', { min: 0, max: 2, default: 0.7 })
    },
    main: (m) => {
      const prompt = m.textInput('Enter prompt')
      const output = m.streamText()
      m.button('Generate', async (btn) => {
        btn.setLoading(true)
        for await (const chunk of callModel(model.value, temp.value, prompt.value)) {
          output.append(chunk)
        }
        output.done()
        btn.setLoading(false)
      })
    },
  })
})
```

Run `bun demo.ts` — a browser opens with a live, structured, interactive page.

---

## Status

This repository contains the project specification, the `lastriko` core package, and the active **MVP Components** roadmap phase.

**Current phase:** [MVP Components](docs/phases/PHASE-2.md) (see [MANIFEST.md](MANIFEST.md#11-development-phases--roadmap))

---

## Documentation Index

### Master Specification

| Document | Description |
|----------|-------------|
| [MANIFEST.md](MANIFEST.md) | **Start here.** Single source of truth — architecture, components, decisions, phases. |

### Phase Plans

| Phase | Document | Status |
|-------|----------|--------|
| 1 | Infrastructure & Foundation — [MANIFEST.md §11.1](MANIFEST.md#111-foundation-milestone-complete) | Complete |
| 2 | [MVP Components](docs/phases/PHASE-2.md) | In Progress |
| 3 | [Advanced Components & Polish](docs/phases/PHASE-3.md) | Not Started |
| 4 | [Plugin Ecosystem](docs/phases/PHASE-4.md) | Not Started |
| 5 | [Desktop & Distribution](docs/phases/PHASE-5.md) | Not Started |
| 6 | [Ecosystem & Community](docs/phases/PHASE-6.md) | Not Started |

### Architecture

| Document | Description |
|----------|-------------|
| [ENGINE.md](docs/architecture/ENGINE.md) | Core engine: HTTP server, WebSocket, `app()`-once lifecycle |
| [PROTOCOL.md](docs/architecture/PROTOCOL.md) | WebSocket message protocol (`RENDER`, `FRAGMENT`, `STREAM_CHUNK`) |
| [STATE.md](docs/architecture/STATE.md) | State management (`ConnectionScope`, Nanostores server-side) |
| [PLUGIN-SYSTEM.md](docs/architecture/PLUGIN-SYSTEM.md) | Plugin isolation rule, `PluginContext` API |

### Component Specifications

| Document | Components Covered |
|----------|-------------------|
| [INPUTS.md](docs/components/INPUTS.md) | `button`, `textInput`, `numberInput`, `slider`, `toggle`, `select`, `fileUpload` + Phase 3 |
| [DISPLAY.md](docs/components/DISPLAY.md) | `text`, `markdown`, `image`, `imageGrid`, `code`, `json`, `table`, `metric`, `progress` + Phase 3 |
| [LAYOUT.md](docs/components/LAYOUT.md) | `shell`, `grid`, `tabs`, `card`, `divider`, `spacer` + Phase 3 |
| [FEEDBACK.md](docs/components/FEEDBACK.md) | `toast`, `alert`, `loading`, `streamText` |
| [AI.md](docs/components/AI.md) | `chatUI`, `promptEditor` + Phase 3 AI components |

### Reference

| Document | Description |
|----------|-------------|
| [API-REFERENCE.md](docs/API-REFERENCE.md) | Full public API with all handle types and signatures |
| [THEMING.md](docs/THEMING.md) | `lastriko.css` token system — all `--lk-*` properties |
| [TESTING.md](docs/TESTING.md) | Testing strategy, coverage gates, CI pipeline |
| [SECURITY.md](docs/SECURITY.md) | Security model, CSP, rate limiting |
| [COMPETITIVE.md](docs/COMPETITIVE.md) | Competitive analysis vs Streamlit, Gradio, Backroad |

### Sample Code

| Example | Description |
|---------|-------------|
| [image-viewer/](examples/image-viewer/) | Simple image review tool — shell, grid, table row clicks, metric updates |
| [experiment-monitor/](examples/experiment-monitor/) | Complex ML dashboard — parallel runs, streaming logs, cross-region handles |

---

## Key Principles

1. **Zero-config start** — One import, one function call, a running UI.
2. **Minimal dependencies** — Core ships under 50KB gzipped.
3. **TypeScript-first** — Full type inference and compile-time safety.
4. **Bun-native, Node-compatible** — Runs on Bun (sub-50ms cold start) or Node.js 22+.
5. **Plugin architecture** — LLM connectors and export targets are plugins, not core.
6. **Desktop-exportable** — Neutralino.js integration for lightweight desktop distribution.
7. **Tests are not optional** — Every piece of code ships with tests. Coverage gates enforced in CI.

---

## Contributing

This project follows a **manifesto-first development process**:

1. Before writing any code, the relevant section of `MANIFEST.md` must already describe it.
2. Any unresolved questions must be answered in the manifesto (and linked docs) before coding begins.
3. Code must only implement what is scoped to the current active phase.
4. Every code change ships with tests in the same PR.

See [`.cursor/rules/`](.cursor/rules/) for the Cursor IDE rules that enforce these principles.

---

## License

MIT — see [LICENSE](LICENSE)
