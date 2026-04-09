# Image Viewer — Simple Example

A phased image review tool for **ArchivDemo GmbH** — a fictional demo company.

## What it demonstrates

| Feature | API |
|---------|-----|
| Shell layout (header + sidebar + main) | `ui.shell()` |
| Two-column grid (stats + tips) | `ui.grid()` |
| One main tab per folder (correct images per selection) | `ui.tabs()` + `TabsHandle.setActive()` |
| Folder list with row click | `ui.table()` + `onRowClick` |
| Filtered table rows | `TableHandle.update({ rows })` after toggles + **Apply filters** |
| Per-phase progress cards | `ui.metric()` (values from mock data per folder) |
| Image gallery grid | `ui.imageGrid()` + inline SVG data URIs (no broken remote URLs) |
| Theme toggle | Built-in toolbar |

## Run

From this directory:

```bash
npm install
npm run dev
# one-shot (good for CI / scripts)
npm run dev:once
```

The server prints the URL (default port from Lastriko, often **3500**).
