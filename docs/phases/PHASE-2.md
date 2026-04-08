# Phase 2 — MVP Components

> **Back to:** [MANIFEST.md](../../MANIFEST.md)
> **Status:** In Progress
> **Target version:** `0.1.0` (first public npm publish)

---

## Goal

Ship the first usable version with enough components to build a real AI demo. This is the **"tell-a-friend" milestone** — the first version where external developers can try Lastriko and accomplish something meaningful.

---

## Exit Criteria

**All of the following must pass before Phase 3 begins:**

### Tests (non-negotiable)
- All unit tests pass across Bun and Node.js 22 and 24 (current CI matrix)
- All integration tests pass
- **E2E (Playwright) and visual regression:** tracked in this doc (§Testing Requirements) but **not blocking** Phase 2 exit until `tests/e2e/` and `tests/visual/` exist — ship after first `npm publish` if needed
- **Coverage:** CI enforces Vitest thresholds on `packages/core` (`npm run test:coverage`; see `packages/core/vitest.config.ts`). Full **90% line / 85% branch** targets in [MANIFEST.md §14.2](../../MANIFEST.md#142-coverage-gates-ci-enforced) remain the north star; raise thresholds as coverage grows.
- Bundle size gates: client ≤ 15KB, core ≤ 50KB

### Functional
A developer must be able to build and run this demo in under 60 lines of code:

```typescript
import { app } from 'lastriko'

app('Experiment Lab', (ui) => {
  ui.shell({
    header: (h) => {
      h.text('**Experiment Lab**')
      const runCount = h.metric('Runs', '0')
    },
    sidebar: (s) => {
      const model = s.select('Model', ['gpt-4o', 'claude-3.5', 'llama-3.1'])
      const temp  = s.slider('Temperature', { min: 0, max: 2, default: 0.7 })
    },
    main: (m) => {
      const queue = m.table([], { columns: ['Name', 'Status', 'Score'] })

      m.button('Run experiment', async (btn) => {
        btn.setLoading(true)
        const row = queue.prepend({ name: 'exp-1', status: 'queued', score: '—' })
        const output = m.streamText()
        for await (const chunk of mockStream()) {
          output.append(chunk)
        }
        output.done()
        row.update({ status: 'done', score: '94.2%' })
        runCount.update(String(queue.rowCount))
        btn.setLoading(false)
      })
    },
  })
})
```

The result must:
- Show a structured dark-mode shell UI (header + sidebar + main)
- Have live-updating table rows and a streaming text output
- Work on Bun and Node.js 22+

---

## Pre-Phase Decisions — All Resolved

All Phase 2 blocking decisions are resolved. See [MANIFEST.md §11.1](../../MANIFEST.md#111-foundation-milestone-complete) and `.cursor/rules/open-questions-check.mdc` for pre–Phase 2 status and the four Phase 3 items that were resolved ahead of implementation.

---

## Deliverables

### 1. Node.js Support

**Acceptance criteria:**
- All Phase 1 features work identically on Node.js 22+
- Runtime detection: `const isBun = typeof Bun !== 'undefined'`
- Fallbacks: `ws` for WebSocket, `chokidar` for file watcher
- CI matrix: Node.js **22 and 24** (npm), plus **Bun** (same scripts after `npm ci`; see `.github/workflows/ci.yml`)

---

### 2. Input Components

| Component | Handle | Notes |
|-----------|--------|-------|
| `button` | `ButtonHandle` | Already in Phase 1; Phase 2 adds `variant` option |
| `textInput` | `InputHandle<string>` | `multiline` option renders `<textarea>` |
| `numberInput` | `InputHandle<number>` | `min`, `max`, `step` |
| `slider` | `InputHandle<number>` | Always shows current value |
| `toggle` | `InputHandle<boolean>` | CSS switch — not bare checkbox |
| `select` | `InputHandle<string>` | String array shorthand |
| `fileUpload` | `InputHandle<UploadedFile\|null>` | HTTP POST `/upload`, not WebSocket |

Full specs: [INPUTS.md](../components/INPUTS.md)

---

### 3. Display Components

| Component | Handle | Notes |
|-----------|--------|-------|
| `text` | `TextHandle` | `.update(content)` pushes FRAGMENT |
| `markdown` | `void` | Server-rendered via `marked`; tag-allowlist sanitized |
| `image` | `ImageHandle` | URL or base64 data URI; null renders placeholder |
| `imageGrid` | `void` | CSS auto-fit grid |
| `code` | `CodeHandle` | `shiki` server-side highlighting; copy button |
| `json` | `JsonHandle` | Collapsible tree via `<details>/<summary>` |
| `table` | `TableHandle` | `.append()`, `.prepend()`, `.remove()`, `row.update()` |
| `metric` | `MetricHandle` | `.update(value)` pushes FRAGMENT; delta coloring |
| `progress` | `ProgressHandle` | 0–100 bar or null spinner; `.update(value)` |

Full specs: [DISPLAY.md](../components/DISPLAY.md)

---

### 4. Layout Components

| Component | Notes |
|-----------|-------|
| `shell` | `header?`, `sidebar?` (left/right), `main` (required), `footer?`. Mobile: hamburger drawer. |
| `grid` | N areas; `cols`, `rows`, `gap`, `minWidth` options |
| `tabs` | Array of `{ label, content }`. Returns `TabsComponent` with `.setActive()`. |
| `card` | Optional title. `elevated` option for shadow. |
| `divider` | `<hr>` with optional label |
| `spacer` | sm/md/lg or number |

Full specs: [LAYOUT.md](../components/LAYOUT.md)

---

### 5. Feedback Components

| Component | Notes |
|-----------|-------|
| `toast` | `type`, `duration`; sent via `TOAST` WebSocket message |
| `alert` | Inline; dismissible option |
| `loading` | `inline` or `fullpage` mode |
| `streamText` | `StreamHandle` with `.append(chunk)` and `.done()`. Sends `STREAM_CHUNK`. |

Full specs: [FEEDBACK.md](../components/FEEDBACK.md)

---

### 6. AI Components (Phase 2 subset)

| Component | Notes |
|-----------|-------|
| `chatUI` | `ChatHandle` with `.addMessage(role, content)`. History in connection-scoped atom. |
| `promptEditor` | `InputHandle<string>` with `{{variable}}` highlighting. `.interpolate(vars)` method. |

Full specs: [AI.md](../components/AI.md)

---

### 7. File Upload Endpoint

**Acceptance criteria:**
- `POST /upload` accepts `multipart/form-data`
- File written to `os.tmpdir()/lastriko-uploads/${connectionId}/`
- Response: `{ name, path, size, type }`
- Temp dir deleted on WebSocket disconnect
- Default size limit: 10MB (configurable)

---

### 8. Complete CSS

**Acceptance criteria:**
- All component CSS classes in `lastriko.css`
- All `--lk-*` tokens implemented
- Light and dark mode correct for all components
- Toolbar theme toggle functional
- Mobile sidebar drawer works (CSS-driven, no JS required)

---

### 9. Documentation for v0.1.0

- Root `README.md` with 5-minute quickstart
- `packages/core/README.md` (npm page)
- [API-REFERENCE.md](../API-REFERENCE.md) covering all Phase 2 components
- Three working examples in `examples/`

---

### 10. npm Publish — `lastriko` v0.1.0

**Pre-publish checklist:**
- [ ] npm name **`lastriko`** (unscoped) available on the registry
- [ ] `packages/core/package.json` has **`version`**, `exports` (including `import`), `types`, `prepack`, `files`, `license`, `repository`
- [ ] `packages/core/README.md` present (npm package page)
- [ ] Optional: root `CHANGELOG.md` or Changesets — not required to cut the first release
- [ ] All CI checks pass (Bun + Node.js matrix)
- [ ] Bundle size: client ≤ 15KB gzip, core ≤ 50KB gzip

---

## Testing Requirements for Phase 2

Every component added in this phase ships with unit + integration tests. No component is "done" until its tests are written and passing.

**Unit tests** (co-located with component source):

| Test | Component |
|------|-----------|
| Renderer produces valid HTML with `data-lk-id` | All components |
| Renderer escapes all user-supplied strings | All components |
| Input `.value` reflects last `EVENT` change | All input types |
| `table.prepend/append` returns a `RowHandle` | `table` |
| `row.update()` sends `FRAGMENT` with row's id | `table` |
| `table.remove()` sends `FRAGMENT` removing the row | `table` |
| `streamText` renders cursor element | `streamText` |
| `.done()` hides cursor | `streamText` |
| `shell` renders only declared regions | `shell` |
| `grid` generates correct column track CSS | `grid` |

**Integration tests** (require running server):

| Test | Flow |
|------|------|
| All 7 input types: change EVENT → atom updated | Input components |
| `table.prepend` → row visible in RENDER; `row.update` → FRAGMENT | Table |
| `streamText.append(chunk)` → `STREAM_CHUNK` messages in correct order | Streaming |
| `streamText.done()` → final `STREAM_CHUNK` with `done: true` | Streaming |
| Button `setLoading(true)` → HTML shows disabled state | Button lock |
| File upload: `POST /upload` → metadata → EVENT → handle value | Upload |
| chatUI `.addMessage()` → FRAGMENT appending message HTML | ChatUI |
| Cross-region: handle declared in header, updated from main button | Handles |

**E2E tests** (Playwright):

| Test | What |
|------|------|
| Shell renders all 4 regions correctly | Layout |
| Grid wraps columns at `minWidth` on narrow viewport | Responsive |
| Sidebar collapses to hamburger on mobile | Shell/mobile |
| All components render correctly in light + dark mode | Visual |
| Button enters loading state and recovers | Button |
| `streamText` shows tokens appearing one by one | Streaming |

**CI gates:**

| Gate | Threshold |
|------|-----------|
| Coverage — `packages/core/src/` | ≥ 90% lines, ≥ 85% branches |
| Coverage — `packages/plugin-*/src/` | ≥ 85% lines, ≥ 80% branches |
| Client bundle | ≤ 15KB gzip |
| Core package | ≤ 50KB gzip |
| Runtime matrix | Bun 1.1+; Node.js 22, 24 (npm) + Bun job |

---

## Non-Goals for Phase 2

- `multiSelect`, `colorPicker`, `dateInput` (Phase 3)
- `video`, `audio`, `diff` (Phase 3)
- `accordion`, `fullscreen` (Phase 3)
- `modelCompare`, `parameterPanel`, `filmStrip`, `beforeAfter` (Phase 3)
- LLM plugins (Phase 4)
- Desktop export (Phase 5)

---

*[← Foundation (MANIFEST §11.1)](../../MANIFEST.md#111-foundation-milestone-complete) — Phase 2 of 6 — [Next: Phase 3 →](PHASE-3.md)*
