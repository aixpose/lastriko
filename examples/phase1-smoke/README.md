# Phase 1 Smoke Example

Minimal Phase 1 app: one text handle and one button handle.

## Run

```bash
cd /path/to/lastriko
npm install
cd examples/phase1-smoke
npm install
npm run dev
```

The server starts on `http://127.0.0.1:3500` by default (or the next free port if 3500 is in use).

`npm run dev` uses `tsx watch`, so editing `demo.ts` restarts the server automatically.

Clicking **Ping** should replace only the text component via a `FRAGMENT` update.

## Why this imports `../../packages/core/src/index.ts`

This example is intended for fast local iteration and imports core source directly.
That means you can run the demo without building `packages/core` first.
