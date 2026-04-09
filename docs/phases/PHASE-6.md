# Phase 6 — Ecosystem & Community

> **Back to:** [MANIFEST.md](../../MANIFEST.md)
> **Status:** Not Started
> **Target version:** `1.0.0`

---

## Goal

Build community momentum, expand capabilities based on real user feedback, and reach the `1.0.0` milestone. This phase is primarily driven by what developers in the community actually need, not by spec.

**This phase is intentionally less prescriptive than earlier phases.** The spec cannot predict what the community will ask for. However, the deliverables below represent the minimum set of work that constitutes a credible 1.0.0 release.

---

## Important Notes Before Proceeding

> **⚠ Two items from the original spec have been challenged and may be removed:**
>
> 1. **"Lastriko Cloud"** — Requires a separate business specification (infrastructure, billing, privacy policy). Not in scope for this technical spec. Deferred to a separate document before any implementation begins.
>
> 2. **"Visual Builder"** — Conflicts with Lastriko's TypeScript-first, code-as-UI philosophy. Requires a different user demographic and significant additional effort. Recommended for removal from the roadmap.

---

## Exit Criteria for 1.0.0

1. All Phase 1–5 deliverables are complete and stable.
2. The plugin API has been stable (no breaking changes) for at least one full phase.
3. Semantic versioning: breaking change process (from Phase 4 API lock) has been followed for any changes.
4. Documentation is complete: every public API has at least one usage example.
5. The project has a `CONTRIBUTING.md` and contributor onboarding guide.
6. At least 3 community-contributed plugins or examples exist.
7. All CI gates from MANIFEST.md §14.2 continue to pass — coverage has not dropped below thresholds as a result of Phase 6 additions.

---

## Deliverables

### 1. Templates Gallery

**What:** A set of pre-built, ready-to-run demo templates that developers can scaffold with `create-lastriko`.

**Templates to build:**

| Template | Command | What It Demonstrates |
|----------|---------|---------------------|
| `chat-bot` | `bunx create-lastriko --template chat-bot` | `chatUI`, `streamText`, `select` for model choice |
| `image-gen` | `bunx create-lastriko --template image-gen` | `promptEditor`, `imageGrid`, `filmStrip`, image plugin |
| `model-compare` | `bunx create-lastriko --template model-compare` | `modelCompare`, side-by-side streaming |
| `document-qa` | `bunx create-lastriko --template document-qa` | `fileUpload`, `chatUI`, vector search |
| `parameter-sweep` | `bunx create-lastriko --template parameter-sweep` | `parameterPanel`, `table`, `metric` |
| `before-after` | `bunx create-lastriko --template before-after` | `beforeAfter`, image processing demo |

**Acceptance criteria:**
- Each template runs with `bun dev` immediately after scaffolding
- Each template has a `README.md` explaining what it demonstrates and what to do next
- Each template uses mocked data by default; real API use requires adding environment variables

---

### 2. Community Plugin Infrastructure

**What:** The scaffolding and guidelines to make it easy for the community to build and publish Lastriko plugins.

**Deliverables:**
- `bunx create-lastriko --template plugin` — scaffolds a plugin package with the correct structure
- `CONTRIBUTING.md` — how to submit a plugin, code standards, review process
- Plugin validation utility: `bunx lastriko validate-plugin ./my-plugin` — checks the plugin implements the interface correctly
- Curated plugin list in `docs/community-plugins.md` (manually maintained; not an automated registry)

---

### 3. Additional Official Plugins (Stretch Goals)

These are stretch goals — ship if resources allow, do not block `1.0.0`:

| Plugin | Notes |
|--------|-------|
| `@lastriko/plugin-huggingface` | HuggingFace Inference API |
| `@lastriko/plugin-replicate` | Replicate hosted models |
| `@lastriko/plugin-generic-llm` | Any OpenAI-compatible endpoint (useful for self-hosted models) |
| `@lastriko/plugin-analytics` | Session analytics for demos — privacy-respecting, opt-in |
| `@lastriko/plugin-i18n` | Internationalization support |

---

### 4. Integration with Popular AI SDKs

**What:** Official guides and adapter utilities for using Lastriko with the major AI SDK ecosystems.

**Targets:**
- **Vercel AI SDK** — `streamText` compatible with Vercel AI's `StreamingTextResponse`
- **LangChain.js** — Guide for using LangChain chains with Lastriko's `chatUI`
- **LlamaIndex.TS** — Guide for document Q&A demos with Lastriko

**Implementation note:** These may not require new plugins — they may just be documentation guides showing how to pipe the SDK's streaming output to `streamText`, for example. Avoid adding dependencies on large SDKs to the core.

---

### 5. Performance Audit & Optimization

With real-world usage data from Phases 1–5, conduct a full performance audit:
- Profile memory usage with 100, 500, 1000 components
- Profile WebSocket throughput under rapid interaction
- Check bundle size has not crept above targets
- Run Lighthouse on a Lastriko demo and aim for 90+ performance score

---

### 6. 1.0.0 Release

**Pre-release checklist:**
- [ ] All CHANGELOG entries reviewed and accurate
- [ ] Migration guide written: `0.x` → `1.0.0` breaking changes (if any)
- [ ] All examples updated to `1.0.0` API
- [ ] Documentation site deployed (GitHub Pages or equivalent)
- [ ] npm publish: `lastriko@1.0.0` and all `@lastriko/*@1.0.0`
- [ ] GitHub Release created with changelog and binary artifacts
- [ ] Announcement post prepared (blog/Twitter/newsletter)

---

## Non-Goals

- "Lastriko Cloud" hosted platform — requires separate business specification first
- Visual drag-and-drop builder — conflicts with code-first philosophy, recommend removal from roadmap
- Mobile native apps — out of scope; Neutralino targets desktop only
- Server-side rendering / SSR — Lastriko is a dev-tool, not a production web framework

---

## Post-1.0.0 Direction (Speculative)

These are not committed deliverables but are potential directions after `1.0.0`:

- **Lastriko for CI:** Run a Lastriko demo as part of a CI/CD pipeline to generate visual reports
- **Notebook integration:** Export a Lastriko demo as a Jupyter-compatible format
- **Collaborative demos:** Multiple users interacting with the same demo simultaneously (requires rethinking the per-connection state isolation model)

---

*[← Phase 5](PHASE-5.md) — Phase 6 of 7*
