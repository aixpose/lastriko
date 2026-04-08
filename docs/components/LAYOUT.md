# Layout Components — Specification

> **Back to:** [MANIFEST.md](../../MANIFEST.md#43-layout-components)
> **Phase:** 1 (shell skeleton), 2 (full implementation)
> **Last updated:** 2026-04-07 — rewritten with shell + grid layout system

---

## Design Philosophy

Lastriko's layout system has **one primary goal**: let developers place any component anywhere in a clean, structured page without fighting CSS. It is designed for lab-testing and AI demo UIs — not marketing pages.

**Two primitives cover everything:**

1. **`ui.shell()`** — defines the page structure (header, sidebar, main, footer)
2. **`ui.grid()`** — splits any region into rows and columns

Everything else (tabs, cards, dividers) works within these two primitives. The system is intentionally small — three layout decisions cover 95% of use cases.

---

## The Three Layout Decisions

When building a Lastriko app, a developer makes at most three layout decisions:

1. **Do I need a shell?** (header, sidebar, footer) — use `ui.shell()`
2. **Do I need to split the main area into columns or rows?** — use `ui.grid()`
3. **Do I need to switch between content sets?** — use `ui.tabs()`

That's it. No CSS classes, no flexbox, no grid track syntax unless you want it.

---

## `ui.shell()` — Page Structure

Defines the named regions of the page. **Free placement**: only declare the regions you need. Undeclared regions do not render.

### API

```typescript
ui.shell(regions: ShellRegions): ShellHandle

interface ShellRegions {
  header?:  (ctx: UIContext) => void   // top bar — full width
  sidebar?: (ctx: UIContext) => void   // side panel — left or right
  main:     (ctx: UIContext) => void   // required — the primary content area
  footer?:  (ctx: UIContext) => void   // bottom bar — full width
}

interface ShellOpts {
  sidebarPosition?: 'left' | 'right'  // Default: 'left'
  sidebarWidth?:    string             // CSS width. Default: '260px'
  headerHeight?:    string             // CSS height. Default: 'auto'
  footerHeight?:    string             // CSS height. Default: 'auto'
  stickyHeader?:    boolean            // Default: true
  stickyFooter?:    boolean            // Default: false
}

// Overloads
ui.shell(regions: ShellRegions): ShellHandle
ui.shell(regions: ShellRegions, opts: ShellOpts): ShellHandle
```

### Visual Structure

```
┌──────────────────────────────────────────┐
│  HEADER  (sticky by default)             │
├──────────┬───────────────────────────────┤
│          │                               │
│ SIDEBAR  │   MAIN                        │
│ (left or │   (required — your content)   │
│  right)  │                               │
├──────────┴───────────────────────────────┤
│  FOOTER                                  │
└──────────────────────────────────────────┘
```

### Example — Full Shell

```typescript
app('Experiment Lab', (ui) => {
  ui.shell({
    header: (h) => {
      h.text('**Experiment Lab**')
      const saveBtn = h.button('Save', async () => { /* ... */ })
      const status = h.metric('Status', 'idle')
    },

    sidebar: (s) => {
      const model    = s.select('Model', ['gpt-4o', 'claude-3.5', 'llama-3.1'])
      const temp     = s.slider('Temperature', { min: 0, max: 2, default: 0.7 })
      const maxTok   = s.numberInput('Max tokens', { default: 1024 })
      s.divider()
      s.button('Reset defaults', () => { /* ... */ })
    },

    main: (m) => {
      const prompt = m.promptEditor({ label: 'Prompt' })
      m.button('Run', async (btn) => {
        btn.setLoading(true)
        const output = m.streamText()
        for await (const chunk of callModel(model.value, temp.value)) {
          output.append(chunk)
          status.update(chunk.tokenCount + ' tokens')  // crosses into header
        }
        btn.setLoading(false)
      })
    },

    footer: (f) => {
      f.text('Lastriko v0.1.0')
    },
  }, { sidebarPosition: 'left', sidebarWidth: '280px' })
})
```

### Cross-Region Handle Access

Handles declared in any region can be read or updated from any callback. This is the pattern for metrics in the header that reflect activity in the main area — declare the handle in header, close over it in the main callback.

```typescript
ui.shell({
  header: (h) => {
    const tokenCount = h.metric('Tokens', 0)  // declared in header
  },
  main: (m) => {
    m.button('Run', async () => {
      // tokenCount is in scope — closes over the outer variable
      for await (const chunk of stream) {
        tokenCount.update(chunk.total)  // updates header region
      }
    })
  },
})
```

### Mobile Behaviour

On viewports narrower than `768px`:
- Sidebar collapses — hidden by default
- A hamburger icon (☰) appears in the header
- Tapping it opens the sidebar as a **drawer** (slides in from the side, overlays main)
- Tapping outside or pressing Escape closes the drawer
- Header and footer remain full-width
- No JavaScript is required for the open/close — driven by a hidden `<input type="checkbox">` CSS trick, progressively enhanced with JS for smooth animation

---

## `ui.grid()` — Content Area Splitting

Splits any region (most commonly `main`) into rows and columns. This is how you place two panels side by side, or a results area above a log panel.

### API

```typescript
ui.grid(areas: GridArea[], opts?: GridOpts): void

type GridArea = (ctx: UIContext) => void

interface GridOpts {
  cols?:     number | string[]   // number = equal columns; string[] = CSS track sizes
                                 // Default: areas.length (equal width columns)
  rows?:     number | string[]   // number = equal rows; string[] = CSS track sizes
                                 // Default: 1 (single row, all areas in one row)
  gap?:      number              // Gap between cells in px. Default: 16
  minWidth?: number              // Min cell width before wrapping. Default: 200px
}
```

### Grid Layouts

**Two equal columns (most common):**
```typescript
m.grid([
  (left) => {
    left.metric('Accuracy', '94.2%')
    left.metric('Latency', '1.2s')
  },
  (right) => {
    right.image(outputImage, { alt: 'Model output' })
  },
])
```

**Three equal columns:**
```typescript
m.grid([
  (col) => { col.streamText() },
  (col) => { col.streamText() },
  (col) => { col.streamText() },
], { cols: 3 })
```

**Custom widths — sidebar-like split inside main:**
```typescript
m.grid([
  (narrow) => { narrow.json(debugData) },
  (wide)   => { wide.table(results) },
], { cols: ['300px', '1fr'] })
```

**Stacked rows:**
```typescript
m.grid([
  (top)    => { top.streamText({ label: 'Output' }) },
  (bottom) => { bottom.code(logs, { lang: 'bash' }) },
], { cols: 1, rows: ['1fr', '200px'] })
```

**Auto-responsive (wraps on narrow screens):**
```typescript
m.grid([
  (a) => { a.metric('Run 1', score1) },
  (b) => { b.metric('Run 2', score2) },
  (c) => { c.metric('Run 3', score3) },
  (d) => { d.metric('Run 4', score4) },
], { minWidth: 180 })
// Uses CSS auto-fit: repeat(auto-fit, minmax(180px, 1fr))
```

### Nesting

Grid cells are full `UIContext` instances — you can nest grids, tabs, and cards inside them:

```typescript
m.grid([
  (left) => {
    left.tabs([
      { label: 'Metrics',  content: (t) => { t.metric('F1', 0.92) } },
      { label: 'Raw JSON', content: (t) => { t.json(rawData) } },
    ])
  },
  (right) => {
    right.grid([
      (top)    => { top.imageGrid(outputs) },
      (bottom) => { bottom.progress(progress) },
    ], { cols: 1, rows: ['1fr', '60px'] })
  },
])
```

---

## `ui.tabs()` — Content Switching Within a Region

Switches between content sets within a region. Not a top-level navigation bar — use `ui.shell()` regions for page-level structure.

### API

```typescript
ui.tabs(tabs: TabDef[], opts?: TabsOpts): TabsComponent

interface TabDef {
  label:    string
  content:  (ctx: UIContext) => void
  disabled?: boolean
}

interface TabsOpts {
  defaultTab?: string    // Label of initially active tab. Default: first tab
}

interface TabsComponent extends ComponentHandle<TabsProps, string> {
  value: string          // Label of currently active tab
  setActive(label: string): void  // Programmatically switch tabs
}
```

### Example

```typescript
m.tabs([
  {
    label: 'Results',
    content: (t) => {
      t.table(results)
    },
  },
  {
    label: 'Logs',
    content: (t) => {
      t.code(logOutput, { lang: 'bash' })
    },
  },
  {
    label: 'Config',
    content: (t) => {
      t.json(configSnapshot)
    },
  },
])
```

Tabs can be combined with grid — a tabbed view in one grid cell, a live metric panel in another:

```typescript
m.grid([
  (left) => {
    left.tabs([
      { label: 'Output', content: (t) => t.streamText() },
      { label: 'Logs',   content: (t) => t.code(logs) },
    ])
  },
  (right) => {
    right.metric('Tokens', tokenCount)
    right.metric('Latency', latency)
    right.progress(jobProgress)
  },
], { cols: ['1fr', '200px'] })
```

---

## `ui.card()` — Grouping

Visually groups related components with a border and optional title. Not a layout primitive — cards live inside grid cells or regions.

```typescript
ui.card(title: string, content: (ctx: UIContext) => void): void
ui.card(content: (ctx: UIContext) => void): void
ui.card(title: string, opts: CardOpts, content: (ctx: UIContext) => void): void

interface CardOpts {
  elevated?:  boolean             // Drop shadow. Default: false
  padding?:   'sm' | 'md' | 'lg' // Default: 'md'
}
```

```typescript
m.grid([
  (left) => {
    left.card('Model A', (c) => {
      c.metric('Score', '92.1%')
      c.streamText()
    })
  },
  (right) => {
    right.card('Model B', (c) => {
      c.metric('Score', '89.7%')
      c.streamText()
    })
  },
])
```

---

## `ui.divider()` and `ui.spacer()`

Visual utilities — used within any region or grid cell.

```typescript
ui.divider(opts?: { label?: string, spacing?: 'sm' | 'md' | 'lg' }): void
ui.spacer(size?: number | 'sm' | 'md' | 'lg'): void

// Spacer sizes: sm=8px, md=16px (default), lg=32px
```

---

## Layout Component Summary

| Component | Phase | Purpose |
|-----------|-------|---------|
| `ui.shell()` | 2 | Page structure — header, sidebar, main, footer |
| `ui.grid()` | 2 | Split any region into rows/columns |
| `ui.tabs()` | 2 | Switch content sets within a region |
| `ui.card()` | 2 | Group related components visually |
| `ui.divider()` | 2 | Horizontal separator |
| `ui.spacer()` | 2 | Vertical whitespace |

**Removed from previous spec** (replaced by `shell` + `grid`):
- `columns()` → replaced by `grid()`
- `sidebar()` (standalone) → part of `shell()`
- `fullscreen()` → deferred to Phase 3 (modal overlay)
- `accordion()` → Phase 3 (not a layout primitive)

---

## CSS Implementation Notes

All layout uses CSS Grid and Flexbox — no JavaScript for layout.

**Shell CSS structure:**
```css
.lk-shell {
  display: grid;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
  grid-template-columns: var(--lk-sidebar-width, 260px) 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}
/* Variants generated when regions are omitted */
.lk-shell--no-sidebar { grid-template-columns: 1fr; }
.lk-shell--sidebar-right { /* swap column order */ }
```

**Mobile sidebar (hamburger drawer):**
```css
@media (max-width: 768px) {
  .lk-sidebar { transform: translateX(-100%); position: fixed; /* ... */ }
  .lk-sidebar-toggle:checked ~ .lk-sidebar { transform: translateX(0); }
}
```

**Grid CSS:**
```css
.lk-grid {
  display: grid;
  gap: var(--lk-grid-gap, 16px);
  grid-template-columns: var(--lk-grid-cols, repeat(auto-fit, minmax(200px, 1fr)));
}
```

---

*Related docs: [INPUTS.md](INPUTS.md) | [DISPLAY.md](DISPLAY.md) | [FEEDBACK.md](FEEDBACK.md) | [AI.md](AI.md)*
