# Theming System

> **Back to:** [MANIFEST.md](../MANIFEST.md#5-theming-system)
> **Phase:** 1 (CSS foundation), 2 (complete token set + toolbar toggle)
> **Last updated:** 2026-04-07 — rewritten for self-contained CSS (no Pico.css, no CDN)

---

## Architecture

Lastriko ships a single self-contained CSS file (`lastriko.css`, ~8KB uncompressed). No CDN, no external dependencies.

```
packages/core/src/theme/lastriko.css
  ↓ Served at /style.css by the engine
  ↓ Inlined for desktop export and static export (offline use)

Layers inside lastriko.css:
  1. CSS custom properties (--lk-* tokens) on :root
  2. [data-theme="dark"] overrides
  3. Base element styles (body, h1-h6, p, a, code, table, input, button...)
  4. Lastriko component classes (.lk-field, .lk-card, .lk-metric, .lk-toggle...)
  5. Lastriko toolbar styles (.lk-toolbar)

Developer overrides (via defineConfig):
  ↓ Injected as <style> block after lastriko.css link
```

**Why self-contained:**
- Works fully offline — required for desktop export (Neutralino)
- No CDN latency or availability risk
- Full control over every style — no cascade conflicts with external library
- Toggle switches, range sliders, filmStrip etc. all need custom CSS anyway
- Single file to serve, link, or inline

---

## Token Reference

All `--lk-*` tokens are defined on `:root` and overridden for dark mode via `[data-theme="dark"]`.

### Color Tokens

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--lk-bg` | `#ffffff` | `#1a1a2e` | Page background |
| `--lk-surface` | `#f8f9fa` | `#16213e` | Card, container, elevated surface |
| `--lk-surface-raised` | `#ffffff` | `#0f3460` | Input backgrounds, elevated cards |
| `--lk-text` | `#111827` | `#e2e8f0` | Primary body text |
| `--lk-text-muted` | `#6b7280` | `#94a3b8` | Secondary, helper text |
| `--lk-text-inverse` | `#ffffff` | `#111827` | Text on accent backgrounds |
| `--lk-accent` | `#e94560` | `#e94560` | Primary action color (buttons, links, focus rings) |
| `--lk-accent-hover` | `#c73351` | `#ff6b84` | Accent on hover |
| `--lk-accent-subtle` | `#fce7ec` | `#3d1020` | Accent background for tags, badges |
| `--lk-border` | `#d1d5db` | `#2d3748` | Component borders, dividers |
| `--lk-border-focus` | `#e94560` | `#e94560` | Focus ring color |
| `--lk-input-bg` | `#ffffff` | `#0f3460` | Input field background |
| `--lk-success` | `#10b981` | `#34d399` | Success states, positive delta |
| `--lk-success-subtle` | `#d1fae5` | `#064e3b` | Success background |
| `--lk-error` | `#ef4444` | `#f87171` | Error states, negative delta |
| `--lk-error-subtle` | `#fee2e2` | `#7f1d1d` | Error background |
| `--lk-warning` | `#f59e0b` | `#fbbf24` | Warning states |
| `--lk-warning-subtle` | `#fef3c7` | `#78350f` | Warning background |
| `--lk-info` | `#3b82f6` | `#60a5fa` | Informational states |
| `--lk-info-subtle` | `#dbeafe` | `#1e3a5f` | Info background |

### Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--lk-radius` | `8px` | Default border radius |
| `--lk-radius-sm` | `4px` | Small radius (tags, badges) |
| `--lk-radius-lg` | `12px` | Large radius (modals, cards) |
| `--lk-radius-full` | `9999px` | Pill/circle shapes (toggle switch) |
| `--lk-spacing-xs` | `4px` | Minimum spacing |
| `--lk-spacing-sm` | `8px` | Small spacing |
| `--lk-spacing-md` | `16px` | Default spacing |
| `--lk-spacing-lg` | `24px` | Large spacing |
| `--lk-spacing-xl` | `32px` | Extra large spacing |

### Typography Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--lk-font` | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | Body font stack |
| `--lk-font-mono` | `ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace` | Code font stack |
| `--lk-font-size-sm` | `0.875rem` | Small text (helper text, labels) |
| `--lk-font-size-md` | `1rem` | Body text |
| `--lk-font-size-lg` | `1.125rem` | Large text |
| `--lk-font-size-xl` | `1.5rem` | Metric values |
| `--lk-font-size-2xl` | `2rem` | Large metrics |
| `--lk-font-weight-normal` | `400` | Normal weight |
| `--lk-font-weight-medium` | `500` | Medium weight (labels) |
| `--lk-font-weight-bold` | `700` | Bold (headings, metric values) |
| `--lk-line-height` | `1.5` | Body line height |

### Shadow Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--lk-shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle elevation |
| `--lk-shadow-md` | `0 4px 6px rgba(0,0,0,0.07)` | `0 4px 6px rgba(0,0,0,0.4)` | Cards, dropdowns |
| `--lk-shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | `0 10px 15px rgba(0,0,0,0.5)` | Modals, popovers |

---

## Implementation

### `tokens.css`

```css
/* packages/core/src/theme/tokens.css */
:root {
  /* Color */
  --lk-bg: #ffffff;
  --lk-surface: #f8f9fa;
  --lk-text: #111827;
  --lk-accent: #e94560;
  --lk-border: #d1d5db;
  --lk-input-bg: #ffffff;
  --lk-success: #10b981;
  --lk-error: #ef4444;
  --lk-warning: #f59e0b;
  /* ... all tokens ... */
  
  /* Spacing */
  --lk-radius: 8px;
  --lk-spacing-md: 16px;
  
  /* Typography */
  --lk-font: system-ui, sans-serif;
  --lk-font-mono: ui-monospace, monospace;
}

[data-theme="dark"] {
  --lk-bg: #1a1a2e;
  --lk-surface: #16213e;
  --lk-text: #e2e8f0;
  --lk-border: #2d3748;
  --lk-input-bg: #0f3460;
  --lk-success: #34d399;
  --lk-error: #f87171;
  --lk-warning: #fbbf24;
  /* ... dark overrides ... */
}
```

### Theme Switching

Theme is applied by setting `data-theme` on the `<html>` element:

```typescript
// packages/core/src/client/theme.ts
function setTheme(mode: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('lk-theme', mode);
}

function detectTheme(): 'light' | 'dark' {
  // 1. Check localStorage preference
  const stored = localStorage.getItem('lk-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  
  // 2. Check system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  
  return 'light';
}
```

---

## Developer Customization

Developers can override any token via `defineConfig`:

```typescript
import { defineConfig } from 'lastriko';

export default defineConfig({
  theme: {
    mode: 'dark',           // 'light' | 'dark' | 'auto'
    tokens: {
      '--lk-accent': '#7c3aed',       // Purple instead of red
      '--lk-radius': '12px',           // Rounder corners
      '--lk-font': "'Inter', sans-serif",
    },
  },
});
```

These overrides are injected as inline `<style>` in `index.html` at server start:

```html
<style>
:root {
  --lk-accent: #7c3aed;
  --lk-radius: 12px;
}
</style>
```

They apply to both light and dark modes. For mode-specific overrides, the developer can pass separate `lightTokens` and `darkTokens` objects (Phase 3 enhancement).

---

## Toolbar

The Lastriko toolbar is a fixed bar at the top of the page (`.lk-toolbar`) providing:
- Project title (from `app()` first argument)
- Theme toggle (sun/moon icon button)
- "Powered by Lastriko" badge (hidden via `toolbar: false` config)

The toolbar uses `--lk-surface` as its background, `--lk-border` as its bottom border, and floats above the content with a subtle shadow. It is styled entirely in `lastriko.css` under `.lk-toolbar` — no JavaScript for layout.

---

## CSS File Structure

```css
/* lastriko.css — delivered in this order */

/* 1. Custom properties */
:root { --lk-bg: ...; --lk-accent: ...; ... }
[data-theme="dark"] { --lk-bg: ...; ... }

/* 2. Reset and base elements */
*, *::before, *::after { box-sizing: border-box; }
body { font-family: var(--lk-font); background: var(--lk-bg); color: var(--lk-text); }
h1, h2, h3, h4, h5, h6 { ... }
a { color: var(--lk-accent); }
input, select, textarea, button { ... }
table { ... }
code, pre { font-family: var(--lk-font-mono); }

/* 3. Component classes */
.lk-field { ... }          /* label + input wrapper */
.lk-card { ... }
.lk-metric { ... }
.lk-toggle { ... }         /* checkbox as switch */
.lk-progress { ... }
.lk-alert { ... }
.lk-alert--info { ... }
.lk-alert--success { ... }
.lk-alert--warning { ... }
.lk-alert--error { ... }
.lk-toast-container { ... }
.lk-toast { ... }
.lk-code { ... }           /* syntax highlighted code block */
.lk-json { ... }           /* collapsible JSON tree */
.lk-stream-text { ... }    /* streaming text with cursor */
.lk-chat { ... }           /* chatUI */
.lk-film-strip { ... }
.lk-before-after { ... }

/* 4. Toolbar */
.lk-toolbar { ... }

/* 5. Error overlay */
.lk-error-overlay { ... }
```

---

## Accessibility — Color Contrast

All default token combinations must meet WCAG 2.1 AA:

| Combination | Light Ratio | Dark Ratio | Required |
|-------------|------------|------------|----------|
| `--lk-text` on `--lk-bg` | 16.1:1 | 11.5:1 | 4.5:1 |
| `--lk-text` on `--lk-surface` | 14.3:1 | 9.8:1 | 4.5:1 |
| `--lk-text-inverse` on `--lk-accent` | 5.2:1 | 5.2:1 | 4.5:1 |
| `--lk-success` on `--lk-bg` | 4.6:1 | 7.1:1 | 3:1 (large text) |
| `--lk-error` on `--lk-bg` | 5.1:1 | 6.8:1 | 3:1 (large text) |

> **Note:** These ratios are targets. Actual values must be verified with a contrast checker tool before Phase 2 ships.

---

*Related docs: [MANIFEST.md](../MANIFEST.md#5-theming-system)*
