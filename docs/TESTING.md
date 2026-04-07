# Testing Strategy

> **Back to:** [MANIFEST.md](../MANIFEST.md#14-testing-strategy)
> **Cursor rule:** [`.cursor/rules/test-coverage.mdc`](../.cursor/rules/test-coverage.mdc)
> **Phase:** 1 (unit + integration foundation), 2 (E2E + visual), 3+ (maintained and extended)

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
      │Integration│  bun:test + puppeteer — WS flow, hot reload
     ┌┴──────────┴┐
     │    Unit     │  bun:test — Component handles, state, HTML rendering, utils
     └────────────┘
```

---

## Unit Tests

**Tool:** `bun:test` (primary), with `vitest` as a Node.js fallback.

**Coverage target:** 90%+ for all code in `packages/core/src/`.

**Location:** `packages/core/src/**/__tests__/*.test.ts` — co-located with source.

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
// components/__tests__/renderer.test.ts
import { test, expect } from 'bun:test';
import { renderComponent } from '../renderer';

test('rendered HTML includes data-lk-id on root element', () => {
  const handle = makeTextHandle('text-1', 'hello');
  const html = renderComponent(handle);
  expect(html).toContain('data-lk-id="text-1"');
});

test('rendered HTML escapes user content', () => {
  const handle = makeTextHandle('text-1', '<script>alert(1)</script>');
  const html = renderComponent(handle);
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
});

test('table row update sends FRAGMENT with correct id', async () => {
  // Integration: prepend a row, call row.update(), verify FRAGMENT message
  const { server, client } = await startTestServer(experimentScript);
  const msgs = await client.collectUntil('FRAGMENT');
  expect(msgs[0].payload.id).toMatch(/^row-/);
});
```

---

## Integration Tests

**Tool:** `bun:test` with an in-process WebSocket client.

**Coverage target:** 80%+ for all server-client interaction paths.

**Location:** `packages/core/src/__tests__/integration/*.test.ts`

### Key Integration Scenarios

| Scenario | What it tests |
|----------|--------------|
| READY → RENDER cycle | Client connects, sends READY, receives RENDER with component tree |
| EVENT → FRAGMENT cycle | Client sends EVENT (button click), server runs handler, sends FRAGMENT(s) |
| Hot reload flow | File changes, module re-imported, fresh RENDER sent to all clients |
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

Every pull request runs:

```yaml
# .github/workflows/ci.yml

jobs:
  quality:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        runtime: ['bun', 'node']
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: '1.1.x'
          
      - name: Setup Node (for matrix)
        if: matrix.runtime == 'node'
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: bun install
        
      - name: Type check
        run: bun run typecheck  # tsc --noEmit
        
      - name: Lint
        run: bun run lint       # eslint .
        
      - name: Unit tests
        run: bun test           # or 'node --test' for Node matrix
        
      - name: Build
        run: bun run build      # turbo build
        
      - name: Bundle size check
        run: bun run check-size # Fails if core > 50KB gzip

  integration:
    runs-on: ubuntu-latest
    steps:
      - name: Integration tests
        run: bun run test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - name: Install Playwright
        run: bunx playwright install --with-deps chromium
        
      - name: E2E tests
        run: bun run test:e2e

  visual:
    runs-on: ubuntu-latest
    steps:
      - name: Visual regression
        run: bun run test:visual
```

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
| Unit | Next to source | `*.test.ts` |
| Integration | `packages/core/src/__tests__/integration/` | `*.integration.test.ts` |
| E2E | `tests/e2e/` | `*.spec.ts` |
| Visual | `tests/visual/` | `*.visual.spec.ts` |
| Fixtures | `tests/fixtures/` | `*.ts` (no test suffix) |

---

*Related docs: [MANIFEST.md](../MANIFEST.md#14-testing-strategy)*
