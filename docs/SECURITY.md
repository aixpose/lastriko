# Security Model

> **Back to:** [MANIFEST.md](../MANIFEST.md#15-security-considerations)
> **Phase:** 1 (baseline), 4 (auth plugin)

---

## Threat Model

Lastriko is a **developer tool for local prototyping**, not a production web server. The security model is designed accordingly:

- **Primary user:** A developer running Lastriko locally on their own machine.
- **Secondary user:** A small audience (1–10 people) accessing a shared demo via tunnel or local network.
- **NOT in scope:** High-traffic production deployments, multi-tenant hosting, publicly exposed internet services (without additional hardening).

This threat model means some security measures are defaults that can be relaxed, while others are always-on.

---

## Security Rules

### Rule 1: Localhost Binding (Always-On Default)

```
Default:  server binds to 127.0.0.1 (localhost only)
Override: --host 0.0.0.0 flag or host: '0.0.0.0' in config
```

**Enforcement:** `Bun.serve({ hostname: config.host ?? '127.0.0.1' })`

**Why:** A developer's machine should not unintentionally expose their demo to the local network (where others could access API keys, uploaded files, or private data).

**When to override:** When running in Docker, CI, or when explicitly sharing on a local network.

---

### Rule 2: API Keys Never Leave the Server

**Enforcement:** All LLM API calls happen in the Node/Bun process. The API key is never:
- Serialized into a component's `props` or `value`
- Included in any WebSocket message
- Accessible via any client-side JavaScript

**Implementation:** Plugin authors must follow this rule. The `PluginContext` API enforces it by not providing any mechanism to pass data directly to the client bundle.

**Audit:** CI must include a check that scans `RENDER`/`FRAGMENT`/`STREAM_CHUNK` WebSocket messages (during integration tests) for patterns matching known API key formats.

---

### Rule 3: WebSocket Message Validation

All incoming WebSocket messages are validated before processing:

```typescript
const VALID_CLIENT_MESSAGES = new Set(['READY', 'EVENT', 'RESIZE', 'THEME_CHANGE']);

function validateMessage(raw: string): ClientMessage | null {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  
  if (!isObject(parsed)) return null;
  if (!VALID_CLIENT_MESSAGES.has(parsed.type)) return null;
  if (!validatePayloadSchema(parsed.type, parsed.payload)) return null;
  
  return parsed as ClientMessage;
}
```

**Behavior on invalid message:** Silent drop. Warning logged in dev mode.

---

### Rule 4: Rate Limiting

**Default:** 100 WebSocket messages per second per connection.

```typescript
class RateLimiter {
  private count = 0;
  private resetAt = Date.now() + 1000;
  
  allow(): boolean {
    if (Date.now() > this.resetAt) {
      this.count = 0;
      this.resetAt = Date.now() + 1000;
    }
    return ++this.count <= this.limit;
  }
}
```

**On limit exceeded:** Excess messages are silently dropped. In dev mode, a toast warning is sent to the client.

---

### Rule 5: File Upload Sandboxing

Uploaded files are written to a temporary directory specific to the session:

```typescript
const uploadDir = path.join(os.tmpdir(), 'lastriko-uploads', conn.id);
await fs.mkdir(uploadDir, { recursive: true });
```

**Cleanup:** The directory is deleted when the WebSocket connection closes.

**Filename sanitization:** The original filename from the upload is sanitized before being written to disk. Characters outside `[a-zA-Z0-9._-]` are replaced with underscores.

**Path traversal prevention:** The final path is verified to be within the upload directory before writing.

**Size limits:** Default maximum file size is 10MB per file. Configurable:

```typescript
defineConfig({
  upload: {
    maxSize: 50 * 1024 * 1024,  // 50MB
    tempDir: '/custom/temp/path',
  },
})
```

---

### Rule 6: Content Security Policy

Lastriko sets CSP headers on every HTTP response:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: *;
  media-src 'self' data: blob: *;
  connect-src 'self' ws://localhost:* wss://*;
  font-src 'self';
```

**Notes:**
- No external CDN in the allowlist — Lastriko ships its own CSS, no CDN dependency.
- `'unsafe-inline'` for scripts is required because Lastriko injects the developer's theme token overrides as inline `<style>`. Accepted trade-off for a dev tool.
- `img-src *` is intentionally broad — AI demos routinely load images from arbitrary URLs and base64 data URIs.

---

### Rule 7: Markdown Sanitization

When `ui.markdown()` renders user-provided content (or any content where the source is not trusted), HTML output is sanitized by default to prevent XSS injection.

**What is stripped:**
- `<script>` tags
- Inline event handlers (`onclick`, `onerror`, etc.)
- `javascript:` URLs in `href` attributes
- `<iframe>`, `<object>`, `<embed>`

**Developer override:**
```typescript
ui.markdown(trustedContent, { sanitize: false });
```

This should only be used when the developer is certain the content is safe (e.g., static strings they wrote themselves).

---

### Rule 8: Static Export Security

When using `export --static`:
- All server code is stripped
- No API keys exist in the bundle
- The output contains only the component tree snapshot and the client JS
- Developers must be warned: if their demo calls `process.env` for API keys, those will not work in static mode

---

## Auth Plugin Security Notes

The `@lastriko/plugin-auth` plugin provides basic access control for shared demos:

- **Password mode:** Uses HTTP Basic Auth. Suitable for casual sharing (prevents casual access, not a serious security boundary). Credentials are sent base64-encoded in the `Authorization` header — HTTP Basic Auth is NOT secure over plain HTTP. The plugin should warn if used without HTTPS.
- **API key mode:** Requires an `Authorization: Bearer <key>` header on the WebSocket upgrade request. More secure for programmatic access.

Neither mode is a substitute for proper authentication. Lastriko demos are not designed to handle sensitive user data.

---

## Known Accepted Risks

| Risk | Acceptance Rationale |
|------|---------------------|
| No HTTPS by default | Lastriko is a localhost dev tool. TLS setup complexity outweighs benefit for typical use. Use a reverse proxy for production-like sharing. |
| `unsafe-inline` scripts in CSP | Required for theme token injection. Accepted for a dev tool. |
| Basic Auth over HTTP | Auth plugin explicitly warns users. Suitable for non-sensitive demos. |
| File temp cleanup on normal disconnect | Background processes that need uploaded files must explicitly copy them. Well-documented limitation. |

---

*Related docs: [MANIFEST.md](../MANIFEST.md#15-security-considerations)*
