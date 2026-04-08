# Testing Strategy

> **Back to:** [MANIFEST.md](../MANIFEST.md#14-testing-strategy)
> **Cursor rule:** [`.cursor/rules/test-coverage.mdc`](../.cursor/rules/test-coverage.mdc)
> **Phases:** Foundation shipped unit + integration tests; MVP Components adds E2E + visual; later phases extend coverage.

---

## The Non-Negotiable Rule

**Every piece of code added to `packages/` ships with tests in the same PR.**

Lastriko is a framework. Developers build production demos on top of it. A regression in core breaks every one of those demos silently. Tests are not a nice-to-have — they are the only way to ship new capabilities with confidence.

The practical consequence: if you cannot describe how to test a change, the change is not ready to be written yet.

---

## Test Pyramid

```
        ┌──────┐
        │  E2E  │  Playwright — Key user flows
       ┌┴──────┴┐
       │ Visual  │  Playwright screenshots — Regression
      ┌┴────────┴┐
      │Integration│  Vitest + in-process WS client — WS flow, hot reload
     ┌┴──────────┴┐
     │    Unit     │  Vitest — Component handles, state, HTML rendering, utils
     └────────────┘
```

---

## Unit Tests

**Tool:** [Vitest](https://vitest.dev/) — same API as Jest; runs on Node.js and is invoked by **both** `npm` and `bun` in CI (`npm run test` / `bun run test` from the repo root).

**Coverage target:** 90%+ for all code in `packages/core/src/`.

**Location:** `packages/core/src/**/*.test.ts` next to source, **excluding** `*.integration.test.ts` (those are integration tests; the core `test` script excludes them so they run only under `test:integration`).

### What to Test

Every module in `packages/core/src/` must have a corresponding `.test.ts` file. Minimum test cases per module:

| Module | Required test cases |
|--------|-------------------|
| `engine/renderer.ts` | HTML output has `data-lk-id`; user content is escaped; all component types render without throwing |
| `engine/executor.ts` | `app()` callback called once per connection; re-called on hot reload |
| `engine/lifecycle.ts` | Bootstrap order; plugin `setup()` called before connections open; `teardown()` called on shutdown |
| `engine/watcher.ts` | File change triggers reload callback; debounce prevents double-reload on rapid saves |
| `components/id.ts` | Same position → same ID; different positions → different IDs |
| `components/registry.ts` | Register and retrieve by ID; unknown ID returns undefined |
| `components/context.ts` | Every `UIContext` method returns a handle; handle has `id`, `type`, `update()` |
| `plugins/registry.ts` | Plugin registered once; duplicate name throws; `getPlugin()` returns plugin or undefined |
| `state/scope.ts` | `ConnectionScope` is isolated per connection; `destroy()` clears atoms and runs cleanup fns |
| `client/swap.ts` | `applyFragment()` replaces correct DOM element; unknown ID is a no-op |
| `theme/tokens.ts` | All `--lk-*` tokens in MANIFEST.md §5.2 are defined in `lastriko.css` |

### Example Unit Test

```typescript
// components/renderer.test.ts
import { expect, it } from 'vitest';
import { renderComponent } from './renderer';

it('rendered HTML includes data-lk-id on root element', () => {
  const handle = makeTextHandle('text-1', 'hello');
  const html = renderComponent(handle);
  expect(html).toContain('data-lk-id="text-1"');
});

it('rendered HTML escapes user content', () => {
  const handle = makeTextHandle('text-1', '<script>alert(1)</script>');
  const html = renderComponent(handle);
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
});

it('table row update sends FRAGMENT with correct id', async () => {
  // Integration: prepend a row, call row.update(), verify FRAGMENT message
  const { server, client } = await startTestServer(experimentScript);
  const msgs = await client.collectUntil('FRAGMENT');
  expect(msgs[0].payload.id).toMatch(/^row-/);
});
```

---

## Integration Tests

**Tool:** Vitest with an in-process WebSocket client.

**Coverage target:** 80%+ for all server-client interaction paths.

**Location:** `packages/core/src/__tests__/integration/*.integration.test.ts`

Run from the repo root: `npm run test:integration` (or `bun run test:integration`). These files are **not** part of the default `npm run test` run, so integration scenarios are not executed twice in CI.

### Key Integration Scenarios

| Scenario | What it tests |
|----------|--------------|
| READY → RENDER cycle | Client connects, sends READY, receives RENDER with component tree |
| EVENT → FRAGMENT cycle | Client sends EVENT (button click), server runs handler, sends FRAGMENT(s) |
| Hot reload flow | File changes, module re-imported, fresh RENDER sent to all clients |
| Hot reload preservation (Phase 3) | Slider at 1.5 → save script → slider still 1.5 after reload |
| Hot reload scroll (Phase 3) | Scroll 500px → save script → scroll restored to 500px |
| Hot reload tabs (Phase 3) | Active tab "Results" → save script → "Results" still active |
| Multi-connection isolation | Two clients → different state, no cross-contamination |
| File upload flow | POST /upload returns metadata, EVENT carries metadata, component.value correct |
| Stream text flow | STREAM_CHUNK messages arrive in order, done=true on completion |
| Rate limiting | >100 events/sec results in excess events dropped, not crashed |
| Plugin lifecycle | Plugin setup and teardown called in correct order |
| Error in app() | ERROR message sent to client, server continues running |

### Integration Test Setup

```typescript
// __tests__/integration/helpers.ts
import { startTestServer } from '../../engine';

export async function withTestServer(
  script: string,
  fn: (client: TestWebSocketClient) => Promise<void>
): Promise<void> {
  const server = await startTestServer(script, { port: 0 }); // Random port
  const client = new TestWebSocketClient(`ws://localhost:${server.port}/ws`);
  await client.connect();
  
  try {
    await fn(client);
  } finally {
    await client.disconnect();
    await server.stop();
  }
}

class TestWebSocketClient {
  send(msg: object): void { /* ... */ }
  waitFor(type: string): Promise<Message> { /* ... */ }
  getAll(type: string): Message[] { /* ... */ }
}
```

---

## E2E Tests

**Tool:** [Playwright](https://playwright.dev/) — runs a real browser against a running Lastriko server.

**Location:** `tests/e2e/*.spec.ts`

**Browsers to test:** Chromium (primary), Firefox, WebKit (macOS Safari equivalent).

### Key E2E Flows

| Flow | What it validates |
|------|------------------|
| Hello World demo | App loads, title visible, text visible, no console errors |
| Slider interaction | Move slider → metric updates with new value |
| Text input → reactive text | Type in textInput → paragraph updates in real time |
| Theme toggle | Click toolbar toggle → page background changes, no flash |
| Tab switching | Click tab → different content shown, state preserved |
| Hot reload | Save script file → UI updates without full page reload |
| Error recovery | Break script → error overlay shown → fix script → overlay disappears |
| chatUI basic | Type message → appears in history (mocked response) |

### E2E Test Example

```typescript
// tests/e2e/slider.spec.ts
import { test, expect } from '@playwright/test';
import { startDevServer } from '../helpers';

test('slider value updates metric in real time', async ({ page }) => {
  await startDevServer('examples/hello-world/demo.ts');
  await page.goto('http://localhost:3000');
  
  const slider = page.getByRole('slider', { name: 'Temperature' });
  const metric = page.getByTestId('metric-temperature');
  
  await slider.fill('1.5');
  
  await expect(metric).toHaveText('1.5');
});
```

---

## Visual Regression Tests

**Tool:** Playwright's screenshot comparison feature.

**Location:** `tests/visual/*.spec.ts`

**Baseline:** Stored in `tests/visual/snapshots/`. Committed to the repository.

**CI behavior:** Visual tests run on every PR. Failures (unexpected changes) are reported as PR status checks and show a diff image.

### Visual Regression Scope

| Test | What it captures |
|------|-----------------|
| All components: light mode | Each component rendered with typical data |
| All components: dark mode | Same components in dark mode |
| Theme transition | Before and after theme switch |
| Error overlay | Error state display |
| Chat UI with messages | Chat with 3 messages |
| Metric with positive/negative delta | Both delta directions |
| Alert all types | All 4 alert types |

---

## CI Pipeline

The repository ships [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). On every push and pull request to `main`, a **quality** matrix runs on Ubuntu:

| Job | What runs |
|-----|-----------|
| Node 22 (npm) | `npm ci`, then `npm run` typecheck, lint, test, test:integration, check:bundle |
| Node 24 (npm) | Same as Node 22 |
| Node 26 (npm) | Same as Node 22 |
| 22 (bun) | `npm ci` for a single lockfile, then `bun run` for the same scripts (validates the Bun primary runtime alongside Node) |

Turbo runs `build` before `test` / `test:integration`, so the client bundle exists for HTTP handler tests. `check:bundle` fails if the core client bundle exceeds the gzip limit in `scripts/check-client-size.mjs`.

The published package requires **Node.js 22+** (`engines` in root and `packages/core/package.json`).

**Phase 2** adds Playwright E2E and visual jobs when those suites exist under `tests/e2e/` and `tests/visual/`.

---

## Bundle Size Check

```typescript
// scripts/check-bundle-size.ts
import { gzipSync } from 'zlib';
import { readFileSync } from 'fs';

const LIMITS = {
  'dist/server.js': 50 * 1024,   // 50KB gzip
  'dist/client.js': 15 * 1024,   // 15KB gzip
};

for (const [file, limit] of Object.entries(LIMITS)) {
  const content = readFileSync(file);
  const compressed = gzipSync(content);
  
  if (compressed.length > limit) {
    console.error(`❌ ${file}: ${compressed.length} bytes (limit: ${limit})`);
    process.exit(1);
  }
  
  console.log(`✅ ${file}: ${compressed.length} bytes`);
}
```

---

## Test File Naming Conventions

| Type | Location | Pattern |
|------|----------|---------|
| Unit | Next to source | `*.test.ts` (not `*.integration.test.ts`) |
| Integration | `packages/core/src/__tests__/integration/` | `*.integration.test.ts` |
| E2E | `tests/e2e/` | `*.spec.ts` |
| Visual | `tests/visual/` | `*.visual.spec.ts` |
| Fixtures | `tests/fixtures/` | `*.ts` (no test suffix) |

---

*Related docs: [MANIFEST.md](../MANIFEST.md#14-testing-strategy)*
