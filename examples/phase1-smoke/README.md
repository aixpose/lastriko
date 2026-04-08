# Foundation smoke example

Minimal app: one text handle and one button handle (baseline engine + `FRAGMENT` flow).

## Run

```bash
cd /path/to/lastriko
npm install
cd examples/phase1-smoke
npm install
npm run dev
```

The server starts on `http://127.0.0.1:3500` by default (or the next free port if 3500 is in use).

`npm run dev` now does two things:

1. builds `packages/core` once (so client assets like `/client.js` exist),
2. starts `tsx watch demo.ts` (so editing `demo.ts` restarts the server automatically).

Clicking **Ping** should replace only the text component via a `FRAGMENT` update.

## Why this uses `file:../../packages/core`

The smoke app depends on the local package build output so its browser client assets are served correctly.
The `dev` script handles this automatically via `build:core`, so you still run a single command.
