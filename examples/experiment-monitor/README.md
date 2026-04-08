# Experiment Monitor — Complex Example

A real-time ML experiment tracking dashboard with parallel runs, live log streaming, and cross-region handle updates.

## What it demonstrates

| Feature | API used |
|---------|----------|
| Full shell (header + sidebar + main) | `ui.shell()` |
| Header with live counters | `ui.metric()` updated from sidebar + main callbacks |
| Hyperparameter controls | `ui.slider()` + `ui.toggle()` (Phase 2 API; `ui.parameterPanel()` is Phase 3) |
| Tabbed main area (Queue / Logs / Results / Compare) | `ui.tabs()` |
| Live experiment queue with row-level updates | `ui.table()` + `row.update()` |
| Per-run log streaming | `ui.streamText()` + `output.append()` |
| Parallel fire-and-forget runs | Multiple concurrent `startRun()` calls, no `await` on all |
| Cross-region handle spans | Header metrics declared in `header`, updated from `main` callback |
| Background auto-refresh | `setInterval` + `ui.onDisconnect()` cleanup |
| Side-by-side run comparison | `ui.grid()` with 3 columns + per-column `table` |
| Button lock during run | `btn.setLoading(true/false)` |
| Results table (sortable Phase 3) | `ui.table()` with `sortable: true` |

## Architecture highlights

```
app() declares once:
  - Header metrics (handles hoisted to outer scope)
  - Sidebar: model/env selects + parameterPanel + run buttons
  - Main: tabs with queue table, log stream, results table, compare grid

Button "Run experiment":
  - Creates a table row immediately (queued)
  - Fires streamRunLogs() without await (logs tab updates independently)
  - Awaits runExperiment() and updates the row on completion
  - Updates header metrics and queue metrics after every state change

Button "Run ×5 parallel":
  - Calls startRun() 5 times without await — 5 rows appear, run concurrently
  - Each run has its own row handle; they update independently
```

## Run

```bash
bun demo.ts
# or
node demo.ts
```

Opens at http://localhost:3000
