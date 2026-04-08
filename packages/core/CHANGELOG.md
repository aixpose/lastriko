# Changelog

All notable changes to the **`lastriko`** npm package are documented here. The monorepo roadmap and design history live in the repository root [MANIFEST.md](https://github.com/aixpose/lastriko/blob/main/MANIFEST.md).

## 0.1.1 — 2026-04-08

- **CSS:** Layout and component styles for shell, grid, form fields, table, metrics, progress, tabs, alerts, stream, chat, markdown prose.
- **Markdown:** `ui.markdown()` renders with `marked` + `sanitize-html` (aligned with DISPLAY.md).
- **Tabs:** Fixed `disabled=""` on enabled tab buttons; client-side tab panel switching without server round-trip.
- **Debug:** Open the app with `?debug=1` to log WebSocket send/receive and `/upload` fetch to the browser console (`console.debug`).

## 0.1.0 — 2026-04-08

Initial published MVP (Phase 2 scope): `app()`, WebSocket + HTML fragments, MVP component set, `lastriko/style.css`, Node.js 22+.
