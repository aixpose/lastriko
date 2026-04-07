# LASTRIKO

> **The TypeScript UI Toolkit for AI Demos & Rapid Prototyping**
>
> Version 0.1.0 (in development) — AIXPOSE OÜ

---

**Vision:** The fastest path from "I have an AI model" to "Here's a working, shareable demo."

Lastriko is an open-source npm module that enables developers to build polished demo UIs for AI models, prototypes, and interactive showcases in minutes rather than hours. Think Streamlit, but TypeScript-first, Bun-native, and built for the AI landscape of 2026.

```typescript
import { app } from 'lastriko';

app('My AI Demo', (ui) => {
  ui.text('# Welcome');
  const name = ui.textInput('Your name');
  ui.text(`Hello, ${name.value || 'stranger'}!`);
});
```

Run `bun demo.ts` — a browser opens with a live, styled, interactive page.

---

## Status

This repository is in the **documentation and planning phase**. No code has been written yet. The manifesto, phase plans, and architecture specifications are the current deliverables.

**Current phase:** Pre-Phase 1 (documentation complete, implementation not started)

---

## Documentation Index

### Master Specification

| Document | Description |
|----------|-------------|
| [MANIFEST.md](MANIFEST.md) | **Start here.** The single source of truth for all decisions. |
| [QUESTIONS.md](QUESTIONS.md) | Open questions, spec challenges, and the decision log. |

### Phase Plans

| Phase | Document | Status |
|-------|----------|--------|
| 1 | [Infrastructure & Foundation](docs/phases/PHASE-1.md) | Not Started |
| 2 | [MVP Components](docs/phases/PHASE-2.md) | Not Started |
| 3 | [Advanced Components & Polish](docs/phases/PHASE-3.md) | Not Started |
| 4 | [Plugin Ecosystem](docs/phases/PHASE-4.md) | Not Started |
| 5 | [Desktop & Distribution](docs/phases/PHASE-5.md) | Not Started |
| 6 | [Ecosystem & Community](docs/phases/PHASE-6.md) | Not Started |

### Architecture

| Document | Description |
|----------|-------------|
| [ENGINE.md](docs/architecture/ENGINE.md) | Core engine internals: HTTP server, WebSocket, lifecycle |
| [PROTOCOL.md](docs/architecture/PROTOCOL.md) | WebSocket message protocol specification |
| [STATE.md](docs/architecture/STATE.md) | State management design (Nanostores, scoping) |
| [PLUGIN-SYSTEM.md](docs/architecture/PLUGIN-SYSTEM.md) | Plugin architecture and development guide |

### Component Specifications

| Document | Components Covered |
|----------|-------------------|
| [INPUTS.md](docs/components/INPUTS.md) | button, textInput, slider, toggle, select, fileUpload, + Phase 3 inputs |
| [DISPLAY.md](docs/components/DISPLAY.md) | text, markdown, image, imageGrid, code, json, table, metric, progress, + Phase 3 display |
| [LAYOUT.md](docs/components/LAYOUT.md) | columns, tabs, card, divider, spacer, + Phase 3 layout |
| [FEEDBACK.md](docs/components/FEEDBACK.md) | toast, alert, loading, streamText |
| [AI.md](docs/components/AI.md) | chatUI, promptEditor, + Phase 3 AI components |

### Reference

| Document | Description |
|----------|-------------|
| [API-REFERENCE.md](docs/API-REFERENCE.md) | Full public API quick reference |
| [THEMING.md](docs/THEMING.md) | CSS token system and theming guide |
| [TESTING.md](docs/TESTING.md) | Testing strategy and CI pipeline |
| [SECURITY.md](docs/SECURITY.md) | Security model and considerations |
| [COMPETITIVE.md](docs/COMPETITIVE.md) | Competitive analysis vs Streamlit, Gradio, Backroad |

---

## Key Principles

1. **Zero-config start** — One import, one function call, a running UI.
2. **Minimal dependencies** — Core ships under 50KB gzipped.
3. **TypeScript-first** — Full type inference and compile-time safety.
4. **Bun-native, Node-compatible** — Runs on Bun (sub-50ms cold start) or Node.js 20+.
5. **Plugin architecture** — LLM connectors and export targets are plugins, not core.
6. **Desktop-exportable** — Neutralino.js integration for ~5MB desktop binaries.

---

## Contributing

This project follows a **manifesto-first development process**:

1. Before writing any code, the relevant section of `MANIFEST.md` must already describe it.
2. Open questions in `QUESTIONS.md` must be resolved before coding anything that depends on them.
3. Code must only implement what is scoped to the current active phase.

See [`.cursor/rules/`](.cursor/rules/) for the Cursor IDE rules that enforce these principles.

---

## License

MIT — see [LICENSE](LICENSE) (to be created)
