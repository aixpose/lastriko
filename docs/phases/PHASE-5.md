# Phase 5 — Desktop & Distribution

> **Back to:** [MANIFEST.md](../../MANIFEST.md)
> **Status:** Not Started
> **Target version:** `0.4.0`

---

## Goal

Polished desktop export experience and multiple deployment options. By the end of this phase, a Lastriko demo can be shared as a desktop app, a static HTML file, a Docker container, or a temporary public URL.

---

## Exit Criteria

1. `bunx lastriko export --desktop` produces a working `.zip` for the current platform (Windows, macOS, or Linux) with a < 10MB footprint.
2. `bunx lastriko export --static` produces a `dist/` folder that opens correctly from the filesystem with no server.
3. `bunx lastriko export --docker` produces a `Dockerfile` that builds and runs the demo correctly.
4. `bunx lastriko share` produces a public URL that allows someone on another machine to access the demo.
5. **All export flows have automated tests.** Desktop and static exports are tested in CI with Playwright (open the output in a headless browser, verify key components render). Docker export is tested with `docker build && docker run` in CI.

---

## Pre-Phase Decisions Required

| # | Question | Ref |
|---|----------|-----|
| 1.3 | Static export execution model | [QUESTIONS.md#13](../../QUESTIONS.md#13-websocket-only-architecture-limits-static-export) |
| — | Neutralino.js v6.4 compatibility verified | Check Neutralino.js release notes |
| — | Tunneling service for `share` command | Decision: use `localtunnel`, `ngrok` API, or self-hosted relay |

---

## Deliverables

### 1. `@lastriko/plugin-neutralino` — Full Implementation

> Phase 4 shipped a stub. This phase completes the plugin.

**Full desktop API available when running inside Neutralino:**

```typescript
// Available on ui.plugins.neutralino when in desktop mode
interface NeutralinoAPI {
  isDesktop: boolean;
  
  // File dialogs
  openFile(opts?: { filter?: string[] }): Promise<string | null>;
  saveFile(opts?: { filter?: string[], defaultName?: string }): Promise<string | null>;
  openDirectory(): Promise<string | null>;
  
  // Window management
  minimize(): void;
  maximize(): void;
  unmaximize(): void;
  setFullscreen(enabled: boolean): void;
  setTitle(title: string): void;
  setSize(width: number, height: number): void;
  
  // Tray
  setTray(opts: { icon?: string, menuItems: TrayMenuItem[] }): void;
  
  // System
  showNotification(title: string, content: string): void;
  getClipboard(): Promise<string>;
  setClipboard(text: string): void;
}
```

**All APIs gracefully degrade to no-ops or throw a clear error when not in desktop mode.**

---

### 2. Desktop Export (`--desktop`)

**Command:** `bunx lastriko export --desktop [--platform=win|mac|linux|all]`

**Export pipeline:**

```
Step 1: Bundle client assets
  → Run `bun build` on packages/core/src/client/
  → Output: dist/client/ (HTML + JS + CSS, no CDN dependencies)
  → Inline `lastriko.css` into the bundle (already CDN-free; ensure no external references)

Step 2: Compile server
  → Run `bun build --compile` on the developer's demo.ts
  → Output: dist/server (standalone executable, no Bun runtime needed)

Step 3: Neutralino wrap
  → Download Neutralino binaries for target platform(s) from GitHub releases
  → Configure neutralino.config.json with window size, title, icon
  → Package: dist/desktop/<platform>/

Step 4: Output
  → Zip each platform's folder
  → Print: "Desktop app ready at dist/desktop/lastriko-demo-macos.zip (8.2MB)"
```

**Acceptance criteria:**
- Output opens as a native window on the target platform
- Window title matches the `title` passed to `app()`
- App icon is the Lastriko default unless `favicon` is configured
- No internet connection needed after export (all assets inlined)
- Total size: ≤ 10MB per platform (goal from MANIFEST.md Section 13)

**Cross-platform testing:**
- macOS: WebKit 2 webview
- Windows: WebView2 (requires WebView2 Runtime — document this requirement)
- Linux: WebKitGTK (document system dependency)

**Known limitation:** Windows requires the WebView2 runtime to be installed. The export should include a README noting this. An auto-installer stub (downloads and installs WebView2 silently) is a stretch goal.

---

### 3. Static Export (`--static`)

**Command:** `bunx lastriko export --static`

**The fundamental challenge** (from QUESTIONS.md#1.3): The WebSocket architecture requires a running server. Static export must resolve this.

**Proposed model** (pending decision from QUESTIONS.md#1.3):
- Static export converts the `app()` callback to run **entirely in the browser** using a client-side re-execution engine
- Server-side-only operations (filesystem access, `process.env`) are stubbed with a warning
- LLM plugin calls work if the plugin can operate in browser mode (i.e., direct API calls from browser — requires CORS allowance from provider)
- This means static export has **reduced functionality**: no file system access, no process-level code
- The static export README clearly documents what works and what doesn't

**Output:**
```
dist/static/
├── index.html        # Standalone, all JS/CSS inlined or bundled
├── demo.js           # Developer's script compiled for browser execution
└── assets/           # Any images/files referenced in the demo
```

**Acceptance criteria:**
- `dist/static/index.html` opens in any modern browser from the filesystem
- Interactive components (slider, select, toggle) work correctly
- Components that require server APIs (fileUpload, chatUI with real LLM) show a graceful placeholder

---

### 4. Docker Export (`--docker`)

**Command:** `bunx lastriko export --docker`

**Output:** A `Dockerfile` and `docker-compose.yml` in the project root.

**Generated Dockerfile:**
```dockerfile
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production
COPY . .
EXPOSE 3000
CMD ["bun", "run", "demo.ts"]
```

**Acceptance criteria:**
- `docker build . && docker run -p 3000:3000 <image>` works correctly
- The generated Dockerfile follows Bun best practices (layer caching, non-root user)
- `docker-compose.yml` includes environment variable placeholders for API keys
- Documentation warns that `--host 0.0.0.0` is required in the config when running in Docker

---

### 5. Share / Tunnel (`share`)

**Command:** `bunx lastriko share [--duration=1h]`

**Behavior:**
1. Ensures the local Lastriko server is running (starts it if not)
2. Opens a tunnel to a public URL
3. Prints: `Your demo is live at: https://abc123.lastriko.io`
4. Keeps running until Ctrl+C or duration expires
5. On exit, closes the tunnel and cleans up

**Tunneling approach (pending decision):**

| Option | Pros | Cons |
|--------|------|------|
| `localtunnel` npm package | Free, open source, easy | Unreliable, random URLs |
| `ngrok` API | Reliable, custom subdomains | Requires account, paid for permanent URLs |
| Custom relay server (lastriko.io) | Branded URLs, control | Infrastructure cost, maintenance |

**Recommendation:** Use `localtunnel` for Phase 5 (zero cost, no account needed). Add a note that custom tunneling can be configured via plugin. Leave door open for `lastriko.io` relay in Phase 6.

---

### 6. `@lastriko/plugin-static`

Plugin version of the static export, usable programmatically:

```typescript
import { app } from 'lastriko';
import { staticExport } from '@lastriko/plugin-static';

app('My Demo', {
  plugins: [staticExport({ outDir: 'dist/static' })],
}, (ui) => { ... });
```

---

## Testing Requirements for Phase 5

| Test | Type | What |
|------|------|------|
| Desktop export produces valid binary | E2E | Open app, click button, see result |
| Static export index.html opens from filesystem | E2E | Playwright file:// URL |
| Docker export builds and runs without error | CI | Docker build + run in CI |
| Share command produces accessible URL | Manual | External access test |
| Desktop file dialog returns correct path | E2E | Neutralino mock |
| Desktop binary size ≤ 10MB | Build | CI size check |
| Static export: components work without server | E2E | Playwright (offline mode) |
| Desktop app: no internet required after export | E2E | Playwright (network disabled) |

---

## Known Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Neutralino v6.4 API may differ from spec | Medium | High | Lock Neutralino version, test against pinned release |
| WebView2 on Windows behaves differently than Chrome | High | Medium | Dedicated Windows CI runner or manual testing |
| Static export execution model requires significant engine work | High | High | Budget extra time; may need a separate "static mode" engine |
| Tunnel services are unreliable as free tier | High | Low | Document limitations; this is a convenience feature, not a requirement |

---

## Non-Goals for Phase 5

- Auto-updater for desktop apps (stretch goal, Phase 6)
- Lastriko Cloud hosted deployment (Phase 6)
- Custom domain for tunnels (Phase 6)
- Code signing for desktop binaries (out of scope for v1)

---

*[← Phase 4](PHASE-4.md) — Phase 5 of 6 — [Next: Phase 6 →](PHASE-6.md)*
