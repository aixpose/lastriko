# Phase 2 — MVP Components

> **Back to:** [MANIFEST.md](../../MANIFEST.md)
> **Status:** Not Started
> **Target version:** `0.1.0` (first public npm publish)

---

## Goal

Ship the first usable version with enough components to build a real AI demo. This is the **"tell-a-friend" milestone** — the first version where external developers can try Lastriko and accomplish something meaningful.

---

## Exit Criteria

A developer must be able to build and run this demo in under 60 lines of code:

```typescript
import { app } from 'lastriko'

app('Experiment Lab', (ui) => {
  ui.shell({
    header: (h) => {
      h.text('**Experiment Lab**')
      const runCount = h.metric('Runs', 0)
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
        runCount.update(queue.rowCount)
        btn.setLoading(false)
      })
    },
  })
})
```

The result must:
- Show a structured dark-mode shell UI (header + sidebar + main)
- Have live-updating table rows and a streaming text output
- Work on Bun and Node.js 20+

---

## Pre-Phase Decisions — All Resolved

All Phase 2 blocking decisions are resolved. See MANIFEST.md §18 for the 4 remaining Phase 3 items.

---

## Deliverables

### 1. Node.js Support

**Acceptance criteria:**
- All Phase 1 features work identically on Node.js 20+
- Runtime detection: `const isBun = typeof Bun !== 'undefined'`
- Fallbacks: `ws` for WebSocket, `chokidar` for file watcher
- CI matrix: Bun 1.1+ **and** Node.js 20+

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
- [ ] `@lastriko` npm scope claimed
- [ ] `package.json` has correct `main`, `module`, `types`, `exports`
- [ ] `CHANGELOG.md` generated via Changesets
- [ ] All CI checks pass (Bun + Node.js matrix)
- [ ] Bundle size: client ≤ 15KB gzip, core ≤ 50KB gzip

---

## Testing Requirements for Phase 2

| Test | Type | What |
|------|------|------|
| All input components sync value via EVENT | Integration | 7 input types |
| `table.prepend()` → row appears; `row.update()` → FRAGMENT | Integration | Live row mutation |
| `streamText.append()` → STREAM_CHUNK messages in order | Integration | Streaming |
| `shell` renders correct region HTML | Unit | Layout |
| `grid` responsive: wraps at minWidth | Visual (Playwright) | CSS |
| Button `setLoading(true)` disables the button | Integration | Lock pattern |
| File upload: POST /upload returns metadata; EVENT carries it | Integration | Upload flow |
| ChatUI `.addMessage()` pushes FRAGMENT | Integration | Chat |
| All components render in light and dark mode | Visual (Playwright) | Theme |
| Node.js 20+: all tests pass | CI matrix | Compat |
| Client bundle ≤ 15KB gzip | Build | CI gate |

---

## Non-Goals for Phase 2

- `multiSelect`, `colorPicker`, `dateInput` (Phase 3)
- `video`, `audio`, `diff` (Phase 3)
- `accordion`, `fullscreen` (Phase 3)
- `modelCompare`, `parameterPanel`, `filmStrip`, `beforeAfter` (Phase 3)
- LLM plugins (Phase 4)
- Desktop export (Phase 5)

---

*[← Phase 1](PHASE-1.md) — Phase 2 of 6 — [Next: Phase 3 →](PHASE-3.md)*
