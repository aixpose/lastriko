# Component gallery

Functional 3-page demo for Lastriko components with **progressive complexity**.

The gallery is intentionally structured by workflow goal rather than by raw component count:

1. **Task Intake** — collect validated inputs and produce a concrete run payload.
2. **Execution Desk** — run/track jobs with live streams, chat, and table mutations.
3. **Review Studio** — compare outputs with media + advanced analysis widgets.

## Run

From the repo root:

```bash
cd examples/component-gallery
npm install
npm run dev
```

Open the URL printed in the terminal (default port **3500**). The dev script rebuilds `packages/core` once, then watches `demo.ts`.

**WebSocket / protocol debugging:** append `?debug=1` to the URL once (e.g. `http://127.0.0.1:3500/?debug=1`). The session then logs outbound and inbound messages with `console.debug` in DevTools. Clear with `sessionStorage.removeItem('lk-debug-ws')` or a fresh session without the query param.

## What it shows

### Page 1 — Task Intake (foundation)
- Inputs: `textInput`, `numberInput`, `slider`, `toggle`, `select`, `multiSelect`, `colorPicker`, `dateInput`, `fileUpload`
- Validation + payload preview: `json`, `code`, `metric`
- Goal: build a coherent task config and persist it into the app workflow

### Page 2 — Execution Desk (operational)
- Queue/status: `table` (+ row click, row handle updates, append/remove), `metric`, `progress`
- Live outputs: `streamText`, `chatUI`, `promptEditor`
- Goal: execute and monitor tasks with interactive state updates

### Page 3 — Review Studio (advanced)
- Structured review: `tabs`, `accordion`, `fullscreen`, `card`, `divider`, `spacer`
- Analysis/media: `modelCompare`, `parameterPanel`, `diff`, `image`, `imageGrid`, `filmStrip`, `beforeAfter`, `video`, `audio`, `markdown`, `text`
- Goal: inspect and compare outputs with progressively richer tools

The app keeps cross-page state so every action has visible consequence.

Use **Toggle theme** in the header to switch light/dark mode.
