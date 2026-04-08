# lastriko

Server-driven UI for AI demos and rapid prototypes: your TypeScript `app()` builds handles, the engine renders HTML fragments, and the browser swaps `outerHTML` over a WebSocket.

## Install

```bash
npm install lastriko
```

Requires **Node.js 22+**. [Bun](https://bun.sh) is also supported.

## Quick start

```typescript
import { app } from 'lastriko';

await app('Hello', (ui) => {
  const name = ui.textInput('Name');
  const out = ui.text('Hi!');
  ui.button('Greet', () => {
    out.update(`Hello, ${name.value || 'stranger'}!`);
  });
});
```

Run with `tsx` or `bun`; open the URL printed in the console (default port **3500**).

## Exports

- **JS API** — `import { app, defineConfig } from 'lastriko'`
- **Styles** — `import 'lastriko/style.css'` (or load `/style.css` from the dev server)

## Docs

- [Project manifest & roadmap](https://github.com/aixpose/lastriko/blob/main/MANIFEST.md)
- [API reference](https://github.com/aixpose/lastriko/blob/main/docs/API-REFERENCE.md)
- [Phase 2 (MVP) scope](https://github.com/aixpose/lastriko/blob/main/docs/phases/PHASE-2.md)

## Examples in this repo

- `examples/component-gallery` — all MVP components on one page
- `examples/experiment-monitor`, `examples/image-viewer` — larger demos

## Publishing (maintainers)

From the monorepo root, after tests pass:

```bash
npm run build -w lastriko
npm publish -w lastriko --access public
```

`prepack` runs `build` automatically on `npm publish`.

## License

MIT — see [LICENSE](https://github.com/aixpose/lastriko/blob/main/LICENSE) in the repository root.
