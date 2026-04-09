# Phase 4 — Plugin Ecosystem

> **Back to:** [MANIFEST.md](../../MANIFEST.md)
> **Status:** Not Started
> **Target version:** `0.3.0` (plugins ship as `@lastriko/*` v0.1.0)

---

## Goal

Ship the first official plugins and validate the plugin architecture with real-world use cases. By the end of this phase, a developer can build a production-quality AI demo using real LLM APIs with Lastriko's one-import model.

**This is also the milestone that targets API stability for `1.0.0` — the plugin API must be locked after this phase.**

---

## Exit Criteria

**Tests:** Every plugin ships with its own test suite. Unit tests mock the external API. Integration tests run against the real API only in CI when the relevant secret is present (skip gracefully otherwise). Plugin isolation is verified: no plugin imports from another plugin.

**Functional:** A developer must be able to write this and have it work with real API calls:

```typescript
import { app } from 'lastriko';
import { openai } from '@lastriko/plugin-openai';
import { anthropic } from '@lastriko/plugin-anthropic';

app('Model Comparison', {
  plugins: [
    openai({ apiKey: process.env.OPENAI_API_KEY }),
    anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  ],
}, async (ui) => {
  const prompt = ui.promptEditor({ label: 'Prompt' });
  
  ui.modelCompare([
    { label: 'GPT-4o', model: 'gpt-4o', provider: 'openai' },
    { label: 'Claude 3.5', model: 'claude-3-5-sonnet-20241022', provider: 'anthropic' },
  ], prompt.value);
});
```

---

## Pre-Phase Decisions Required

| # | Question | Ref |
|---|----------|-----|
| — | Plugin API is confirmed stable before this phase begins | Review MANIFEST.md Section 6.1 |
| — | All Phase 3 components complete | Phase 3 exit criteria |

---

## Deliverables

### 1. Plugin Architecture — Final Implementation

Phase 1 created stub interfaces. Phase 4 completes the plugin system:

**`PluginContext` full implementation:**
- `registerComponent(name, renderer)` — adds a new component type available on `UIContext`
- `registerRoute(path, handler)` — adds a new HTTP route to the server
- `registerMiddleware(fn)` — adds middleware to the request pipeline
- `getStore<T>(key)` — creates or retrieves a named Nanostores atom scoped to the plugin
- `config` — the plugin's configuration object (passed at instantiation)
- `logger` — structured logger with `info`, `warn`, `error`, `debug` levels

**Plugin lifecycle hooks (additions):**
- `onConnection(ws)` — called when a new WebSocket connection opens
- `onDisconnect(ws)` — called when a connection closes
- `onEvent(event)` — called for every `EVENT` message from the client

Full spec: [docs/architecture/PLUGIN-SYSTEM.md](../architecture/PLUGIN-SYSTEM.md)

---

### 2. `@lastriko/plugin-openai`

**Package:** `@lastriko/plugin-openai`

**Capabilities:**
- Text generation (chat completions)
- Streaming text generation (for `streamText` component)
- Image generation (DALL-E 3)
- Embeddings (for vector similarity demos)

**API surface added to `UIContext`:**
- `ui.chatUI({ model: 'gpt-4o', provider: 'openai' })` — pre-wired chat
- Direct access via `ui.plugins.openai.client` for advanced use

**Configuration:**
```typescript
openai({
  apiKey: string,           // Required
  baseURL?: string,         // For OpenAI-compatible endpoints
  defaultModel?: string,    // Default: 'gpt-4o'
  organization?: string,    // Optional
})
```

**Dependencies:**
- `openai` npm package (official SDK)

**Testing:**
- Unit tests mock the OpenAI API responses
- Integration tests use `OPENAI_API_KEY` from CI secrets (skipped if not present)

---

### 3. `@lastriko/plugin-anthropic`

**Package:** `@lastriko/plugin-anthropic`

**Capabilities:**
- Claude messages API (text generation)
- Streaming text generation
- Tool use / function calling (displayed in `chatUI`)
- Vision inputs (image in chat)

**Configuration:**
```typescript
anthropic({
  apiKey: string,           // Required
  defaultModel?: string,    // Default: 'claude-3-5-sonnet-20241022'
})
```

**Dependencies:**
- `@anthropic-ai/sdk` npm package

---

### 4. `@lastriko/plugin-ollama`

**Package:** `@lastriko/plugin-ollama`

**Capabilities:**
- Integration with locally running Ollama instance
- Model listing (auto-populates `select` with available models)
- Streaming text generation
- Embeddings

**Configuration:**
```typescript
ollama({
  baseURL?: string,    // Default: 'http://localhost:11434'
  defaultModel?: string,
})
```

**Dependencies:**
- `ollama` npm package (official client) or direct HTTP calls (to minimize deps)

**Note:** This plugin enables Lastriko demos that run entirely locally — no cloud API keys required. This is a significant DX differentiator.

---

### 5. `@lastriko/plugin-neutralino` (Stub)

Phase 4 ships a basic stub of the Neutralino plugin to unblock Phase 5 development:

**Phase 4 scope:**
- Plugin registers correctly without errors
- Provides `ui.plugins.neutralino.isDesktop: boolean` flag
- Remaining desktop APIs are stubbed (logged warning when called in browser mode)

**Full implementation:** Phase 5

---

### 6. `@lastriko/plugin-auth`

**Package:** `@lastriko/plugin-auth`

Enables demos to be password-protected before sharing.

**Configuration:**
```typescript
auth({
  mode: 'password',       // 'password' | 'apiKey' | 'none'
  password?: string,      // Required for 'password' mode
  apiKey?: string,        // Required for 'apiKey' mode
  realm?: string,         // Browser prompt title
})
```

**Behavior:**
- In `password` mode: browser shows a basic auth prompt before any page content
- In `apiKey` mode: requires `Authorization: Bearer <key>` header on WebSocket connection
- Persists session via cookie for the duration of the browser session

---

### 7. Plugin Documentation

**Must ship before any plugin is published:**

- [docs/architecture/PLUGIN-SYSTEM.md](../architecture/PLUGIN-SYSTEM.md) — complete, no stubs
- `packages/plugin-openai/README.md` — installation, configuration, examples
- `packages/plugin-anthropic/README.md` — same
- `packages/plugin-ollama/README.md` — same, emphasizes local-only usage
- Guide: "How to write a custom plugin" in `docs/` (to be created)

---

### 8. Example Project Updates

Add to `examples/`:
- `examples/chat-comparison/` — uses both OpenAI and Anthropic plugins, `modelCompare` component
- `examples/local-llm/` — uses Ollama plugin only, no API keys needed

---

## Testing Requirements for Phase 4

| Test | Type | What |
|------|------|------|
| Plugin `setup()` called during bootstrap | Unit | Lifecycle order |
| Plugin `teardown()` called on process exit | Unit | Cleanup |
| OpenAI streaming produces token-by-token output | Integration | `streamText` + mock API |
| Anthropic tool use results displayed in `chatUI` | Integration | Mock API with tool response |
| Ollama plugin works with no running server (graceful error) | Unit | Connection refused handling |
| Plugin API key never sent to client (WebSocket sniff) | Security | Inspect all WebSocket frames |
| `auth` plugin blocks unauthenticated connections | Integration | WebSocket without credentials |
| Custom plugin can register a new component type | Unit | `registerComponent` API |

---

## API Stability Lock

**After Phase 4, the following APIs are locked and cannot have breaking changes without a major version bump:**

- `LastrikoPlugin` interface (all fields)
- `PluginContext` interface (all methods)
- `ComponentHandle` base interface and all specialised handle types (`InputHandle`, `TableHandle`, `RowHandle`, `StreamHandle`, `MetricHandle`, `ProgressHandle`, `TextHandle`)
- `app()` function signature
- `defineConfig()` function signature
- All input/display/layout/feedback/AI component signatures

**Breaking change process (post-Phase 4):**
1. Deprecate old API with warning in current version
2. Ship new API alongside old API
3. Remove old API in next major version
4. Update MANIFEST.md changelog and affected phase docs

---

## Non-Goals for Phase 4

- Full Neutralino desktop export (Phase 5)
- Static HTML export (Phase 5)
- Docker export (Phase 5)
- `@lastriko/plugin-huggingface` (stretch goal, may slip to Phase 5)
- `@lastriko/plugin-replicate` (stretch goal, may slip to Phase 5)
- Visual plugin marketplace (Phase 6)

---

*[← Phase 3](PHASE-3.md) — Phase 4 of 7 — [Next: Phase 4.5 →](PHASE-4-5.md)*
