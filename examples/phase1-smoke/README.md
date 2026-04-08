# Phase 1 Smoke Example

Minimal Phase 1 app: one text handle and one button handle.

## Run

```bash
cd /path/to/lastriko
npm install
npm run build
cd examples/phase1-smoke
npm install
npm run dev
```

The server starts on `http://127.0.0.1:3000`.

Clicking **Update text** should replace only the text component via a `FRAGMENT` update.

## Why this uses `file:../../packages/core`

This example is intended to run standalone from inside `examples/phase1-smoke/`, so it depends on the local built package output from `packages/core` instead of workspace protocol links.  
If you skip the root build step, install will fail because `dist/` is not present yet.
