# Component gallery

Interactive tour of **all shipped components through Phase 3**: layout, inputs, display/media, feedback, AI widgets, and advanced composites in tabbed pages.

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

- **Inputs & controls page:** button, textInput, numberInput, slider, toggle, select, `multiSelect`, `colorPicker`, `dateInput`.
- **Display & media page:** text/markdown/code/json/image/imageGrid, plus `video`, `audio`, `diff`.
- **Layout & containers page:** shell/grid/tabs/card/divider/spacer, plus `accordion` and `fullscreen`.
- **AI & advanced page:** streamText, chatUI, promptEditor, `modelCompare`, `parameterPanel`, `filmStrip`, `beforeAfter`.
- **Data table page:** large-table virtualization path with interactive row actions (`append`, `remove`, row click, row handle updates).
- **Footer:** fileUpload (`POST /upload`) metadata flow.

Use **Toggle theme** in the header to switch light/dark mode.
