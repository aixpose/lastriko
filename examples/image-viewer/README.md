# Image Viewer — Simple Example

A phased image review tool for **ArchivDemo GmbH** — a fictional demo company.

## What it demonstrates

| Feature | API |
|---------|-----|
| Shell layout (header + sidebar + main) | `ui.shell()` |
| Two-column grid (stats + apply panel) | `ui.grid()` |
| Folder list with row click | `ui.table()` + `onRowClick` |
| Per-phase progress cards | `ui.metric()` with `.update()` |
| Image gallery grid | `ui.imageGrid()` |
| Live content update on folder selection | `handle.update()` |
| Theme toggle | Built-in toolbar |

## Run

```bash
bun demo.ts
# or
node demo.ts
```

Opens at http://localhost:3000
