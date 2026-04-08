# Display Components — Specification

> **Back to:** [MANIFEST.md](../../MANIFEST.md#42-display-components)
> **Phase:** 2 (text, markdown, image, imageGrid, code, json, table, metric, progress), 3 (video, audio, diff)

---

## Design Rules for All Display Components

1. Display components are **read-only** — they have no user-controllable `value`.
2. Display components render their content immediately when called in the script.
3. All display components must handle `null` or `undefined` content gracefully (show placeholder, not crash).
4. Images must always have accessible alt text.
5. Long content (tables, code, JSON) must not overflow the page width — use horizontal scrolling.

---

## `text`

**API:**
```typescript
ui.text(content: string): TextHandle

interface TextHandle extends ComponentHandle<{ content: string }> {
  update(content: string): void  // Re-renders and pushes FRAGMENT
}
```

**Renders as:** `<p>` element. If content starts with `#`, `##`, etc., treat as heading (`<h1>`, `<h2>`, etc.).

**Markdown shorthand:** `ui.text('# Heading')` renders as `<h1>Heading</h1>`. This is a convenience that avoids requiring `ui.markdown()` for simple headings.

**Mutable via handle:** `text()` returns a `TextHandle`. Call `.update(content)` to push a new HTML fragment for just this element:
```typescript
const name     = ui.textInput('Name')
const greeting = ui.text('Hello, stranger!')

ui.button('Greet', () => {
  greeting.update(`Hello, ${name.value || 'stranger'}!`)
})
```

**Phase:** 2

---

## `markdown`

**API:**
```typescript
ui.markdown(content: string, opts?: MarkdownOpts): void

interface MarkdownOpts {
  sanitize?: boolean;    // Default: true — strip dangerous HTML
  breaks?: boolean;      // Default: true — newlines become <br>
}
```

**Renders as:** Parsed Markdown rendered to HTML inside a `<div class="lk-markdown">`.

**Security:** HTML output is sanitized by default to prevent XSS. The developer can disable this with `sanitize: false` if they trust the content source.

**Markdown library:** `marked` — server-side rendering with tag-allowlist sanitization. No client bundle weight.

**Supported Markdown features:**
- Headings (h1–h6)
- Bold, italic, strikethrough
- Ordered and unordered lists
- Code blocks (with language tag for syntax highlighting)
- Blockquotes
- Tables
- Links (open in new tab by default: `target="_blank" rel="noopener"`)
- Images (with `alt` text)

**Phase:** 2

---

## `image`

**API:**
```typescript
ui.image(src: string | null | undefined, opts?: ImageOpts): void

interface ImageOpts {
  alt?: string;           // Alt text (required for accessibility — default: 'Image')
  caption?: string;       // Caption displayed below image
  width?: number | string;  // CSS width ('100%', '300px', etc.)
  height?: number | string;
  zoom?: boolean;         // Click to open full-size (default: true)
  download?: boolean;     // Show download button (default: false)
}
```

**Renders as:** `<figure>` + `<img loading="lazy">` + optional `<figcaption>`. All images use native browser lazy loading by default — off-screen images are not fetched until scrolled into view.

**Null handling:** If `src` is `null`, `undefined`, or empty string: renders a grey placeholder box with the alt text.

**Error handling:** If the image fails to load (404, network error): replace with the same placeholder, show error icon + "Image failed to load" text.

**Data URIs:** `src` can be a base64 data URI for server-generated images:
```typescript
const base64 = generateImageBase64(); // Returns 'data:image/png;base64,...'
ui.image(base64, { alt: 'Generated image', download: true });
```

**Zoom:** When `zoom: true`, clicking the image opens it in a fullscreen overlay with pan/zoom controls. Close with Escape or click outside.

**Phase:** 2

---

## `imageGrid`

**API:**
```typescript
ui.imageGrid(sources: Array<string | ImageGridItem>, opts?: ImageGridOpts): void

interface ImageGridItem {
  src: string;
  alt?: string;
  caption?: string;
}

interface ImageGridOpts {
  cols?: number | 'auto';  // Default: 'auto' (CSS auto-fit grid)
  gap?: number;            // Gap between images in pixels (default: 8)
  minWidth?: number;       // Minimum cell width for auto mode (default: 150)
  aspectRatio?: string;    // CSS aspect-ratio, e.g. '1/1', '16/9' (default: auto)
  zoom?: boolean;          // Click to zoom (default: true)
}
```

**Renders as:** CSS Grid container with one `<figure>` per image.

**Auto-fit grid:** With `cols: 'auto'` (default), uses `grid-template-columns: repeat(auto-fit, minmax(${minWidth}px, 1fr))`. Responsive by default.

**Phase:** 2

---

## `video`

**API:**
```typescript
ui.video(src: string, opts?: VideoOpts): void

interface VideoOpts {
  controls?: boolean;       // Default: true
  autoplay?: boolean;       // Default: false
  muted?: boolean;          // Default: false (required for autoplay in most browsers)
  loop?: boolean;           // Default: false
  poster?: string;          // Thumbnail image URL
  width?: string;           // CSS width (default: '100%')
  caption?: string;
}
```

**Renders as:** `<figure>` + `<video loading="lazy">` + optional `<figcaption>`. Uses native lazy loading where supported.

**Note:** Browser security policies require `muted: true` for `autoplay: true` to work. Lastriko will auto-set `muted: true` if `autoplay: true` is set, with a warning to the developer.

**Phase:** 3

---

## `audio`

**API:**
```typescript
ui.audio(src: string, opts?: AudioOpts): void

interface AudioOpts {
  controls?: boolean;       // Default: true
  autoplay?: boolean;       // Default: false
  loop?: boolean;           // Default: false
  label?: string;           // Accessible label (required for screen readers)
}
```

**Renders as:** `<audio controls>` with custom styling.

**Phase:** 3

---

## `code`

**API:**
```typescript
ui.code(content: string, opts?: CodeOpts): void

interface CodeOpts {
  lang?: string;            // Language hint for syntax highlighting (e.g., 'typescript', 'python')
  lineNumbers?: boolean;    // Show line numbers (default: false)
  copy?: boolean;           // Show copy-to-clipboard button (default: true)
  maxHeight?: number;       // Max height in px before scroll (default: none)
  highlight?: number[];     // Line numbers to highlight
}
```

**Renders as:** `<pre><code class="language-${lang}">` + copy button.

**Syntax highlighting:** `shiki` running server-side. Rendered HTML is sent as part of the `FRAGMENT` — zero client bundle weight, no CDN required.

**Copy button:** Copies the raw (unhighlighted) text to clipboard. Shows "Copied!" for 2 seconds after click.

**Phase:** 2

---

## `json`

**API:**
```typescript
ui.json(data: unknown, opts?: JsonOpts): void

interface JsonOpts {
  collapsed?: boolean;      // Start collapsed (default: false for <3 levels, true for 3+)
  maxDepth?: number;        // Auto-collapse beyond this depth (default: 3)
  label?: string;           // Optional label/title above the viewer
}
```

**Renders as:** Collapsible JSON tree using native `<details>`/`<summary>` HTML elements with Lastriko CSS styling.

**Format:**
- Objects: `{ key: value }` with expandable entries
- Arrays: `[ item1, item2 ]` with expandable entries and count badge
- Strings: displayed in green quotes
- Numbers: displayed in blue
- Booleans: displayed in purple
- Null: displayed in grey

**Phase:** 2

---

## `table`

**API:**
```typescript
// Static display (no mutation needed)
ui.table(data: Record<string, any>[], opts?: TableOpts): TableHandle

interface TableOpts {
  columns?: string[];       // Column names. Default: derived from first row's keys.
  sortable?: boolean;       // Phase 3. Default: false.
  paginate?: number;        // Rows per page (default: no pagination)
  maxHeight?: number;       // Px height before scroll (default: none)
  striped?: boolean;        // Alternate row colors (default: true)
  caption?: string;
  emptyMessage?: string;    // Message when data is empty (default: 'No data')
}

// TableHandle — enables live row mutation
interface TableHandle extends ComponentHandle<TableProps> {
  append(row: Record<string, any>): RowHandle;   // Add row at bottom
  prepend(row: Record<string, any>): RowHandle;  // Add row at top
  remove(rowId: string): void;
  rowCount: number;
  onRowClick(handler: (row: Record<string, any>) => void): void;
}

interface RowHandle {
  id: string;
  update(data: Partial<Record<string, any>>): void;  // Re-renders this row as FRAGMENT
  remove(): void;
}
```

**Example — live experiment queue:**
```typescript
const queue = ui.table([], { columns: ['Name', 'Status', 'Score'] })

ui.button('Run', async (btn) => {
  btn.setLoading(true)
  const row = queue.prepend({ name: 'exp-1', status: 'queued', score: '—' })
  const result = await runExperiment()
  row.update({ status: 'done', score: result.score })
  btn.setLoading(false)
})
```

**Virtual scrolling:** Enabled automatically when row count > 100 (Phase 3).

**Phase:** 2 (full handle API), 3 (sortable, virtual scroll)

---

## `metric`

**API:**
```typescript
ui.metric(label: string, value: string, opts?: MetricOpts): MetricHandle

interface MetricHandle extends ComponentHandle<MetricProps> {
  update(value: string, opts?: MetricOpts): void  // Re-renders and pushes FRAGMENT
}

interface MetricOpts {
  delta?: number;           // Change indicator (+5, -2.3, etc.)
  deltaLabel?: string;      // Label for delta (e.g., 'vs last run')
  unit?: string;            // Unit suffix (e.g., 'ms', 'tokens', '%')
  prefix?: string;          // Value prefix (e.g., '$')
  size?: 'sm' | 'md' | 'lg';  // Default: 'md'
}
```

**Note:** `value` is always a `string`. Convert numbers before passing: `metric.update(String(count))`. This keeps the rendering contract simple — the handle does not need to know about number formatting.

**Renders as:** A card-like block:
```
  Label
  ─────────────────
  [prefix][value][unit]
  [delta] [deltaLabel]
```

**Delta colors:**
- Positive delta → `--lk-success` (green) with ▲ arrow
- Negative delta → `--lk-error` (red) with ▼ arrow
- Zero delta → `--lk-text` with → dash

**Phase:** 2

---

## `progress`

**API:**
```typescript
ui.progress(value: number | null, opts?: ProgressOpts): ProgressHandle

interface ProgressHandle extends ComponentHandle<ProgressProps> {
  update(value: number | null, opts?: ProgressOpts): void  // Re-renders and pushes FRAGMENT
}

interface ProgressOpts {
  label?: string;
  showPercentage?: boolean;  // Default: true
  color?: 'accent' | 'success' | 'error' | 'warning';  // Default: 'accent'
  size?: 'sm' | 'md' | 'lg';  // Default: 'md'
}
```

**Renders as:**
- `value` is 0–100: `<progress value={value} max="100">` + percentage text
- `value` is null: animated indeterminate spinner

**Usage:**
```typescript
const prog = ui.progress(0, { label: 'Processing...' })
for (let i = 0; i <= 100; i += 10) {
  await processChunk(i)
  prog.update(i)  // Re-renders this component and pushes FRAGMENT
}
prog.update(null)  // Switch to spinner if next operation has unknown duration
```

**Phase:** 2

---

## `diff`

**API:**
```typescript
ui.diff(before: string, after: string, opts?: DiffOpts): void

interface DiffOpts {
  mode?: 'split' | 'unified';  // Default: 'split'
  beforeLabel?: string;         // Default: 'Before'
  afterLabel?: string;          // Default: 'After'
  lang?: string;                // Language for syntax highlighting
  context?: number;             // Lines of context around changes (default: 3)
}
```

**Renders as:** Side-by-side (split) or unified diff view with color coding:
- Added lines: green background
- Removed lines: red background
- Context lines: neutral

**Diff algorithm:** Uses `diff` npm package or similar for line-level diff computation (server-side). The diff result is sent as structured data to the client, not computed in the browser.

**Phase:** 3

---

*Related docs: [INPUTS.md](INPUTS.md) | [LAYOUT.md](LAYOUT.md) | [FEEDBACK.md](FEEDBACK.md) | [AI.md](AI.md)*
