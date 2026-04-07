/**
 * Experiment Monitor — Complex Example
 *
 * A real-time experiment tracking dashboard.
 * Mirrors the dense monitoring dashboard in the second screenshot:
 * multiple rows of experiment cards, each with status, metrics,
 * and live log output; background processes push updates independently.
 *
 * Demonstrates:
 *   ui.shell()          — header + sidebar + main
 *   ui.grid()           — metric summary row, then card grid
 *   ui.table()          — experiment queue with live row updates
 *   ui.streamText()     — per-experiment log streaming
 *   ui.tabs()           — switch between Queue / Logs / Config views
 *   ui.metric()         — live KPI counters in header
 *   ui.parameterPanel() — auto-generated run config controls
 *   ui.select()         — model and environment pickers
 *   ui.toggle()         — enable/disable flags
 *   ui.progress()       — per-experiment progress bar
 *   Background push     — status updates arrive independently of buttons
 *   Fire-and-forget     — multiple parallel runs update the UI concurrently
 *   Cross-region spans  — header metrics updated from main callbacks
 */

import { app } from 'lastriko'

// ── Types ──────────────────────────────────────────────────────────────────

type RunStatus = 'queued' | 'running' | 'done' | 'failed'

interface RunConfig {
  model:       string
  environment: string
  batchSize:   number
  epochs:      number
  learningRate: number
  dropout:     number
  earlyStopping: boolean
  seed:        number
}

interface RunResult {
  accuracy:  number
  f1:        number
  precision: number
  recall:    number
  latencyMs: number
  tokens:    number
}

// ── Mock runners ──────────────────────────────────────────────────────────

let runCounter = 0

async function* streamLogs(config: RunConfig): AsyncGenerator<string> {
  const steps = [
    `[init] Loading model ${config.model}...`,
    `[data] Preparing ${config.environment} dataset...`,
    `[train] epoch 1/${config.epochs} — loss: ${(Math.random() * 2).toFixed(4)}`,
    `[train] epoch 2/${config.epochs} — loss: ${(Math.random()).toFixed(4)}`,
    `[eval] Running evaluation on test split...`,
    `[result] accuracy=${(0.85 + Math.random() * 0.12).toFixed(4)}`,
    `[done] Run complete.`,
  ]
  for (const line of steps) {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600))
    yield line + '\n'
  }
}

async function runExperiment(config: RunConfig): Promise<RunResult> {
  await new Promise((r) => setTimeout(r, 3000 + Math.random() * 4000))
  return {
    accuracy:  0.85 + Math.random() * 0.12,
    f1:        0.82 + Math.random() * 0.14,
    precision: 0.80 + Math.random() * 0.16,
    recall:    0.84 + Math.random() * 0.12,
    latencyMs: 800  + Math.random() * 1200,
    tokens:    Math.floor(1000 + Math.random() * 3000),
  }
}

// ── App ───────────────────────────────────────────────────────────────────

app('Experiment Monitor', { theme: 'dark' }, (ui) => {

  // ── Header ──────────────────────────────────────────────────────────────
  ui.shell({
    header: (h) => {
      h.text('**Experiment Monitor**')
      h.grid([
        (col) => { totalRuns    = col.metric('Total runs',  '0') },
        (col) => { runningCount = col.metric('Running',     '0') },
        (col) => { doneCount    = col.metric('Completed',   '0') },
        (col) => { failedCount  = col.metric('Failed',      '0', { color: 'error' }) },
        (col) => { bestAccuracy = col.metric('Best accuracy', '—') },
      ], { cols: 5, gap: 24 })
    },

    // ── Sidebar — run configuration ────────────────────────────────
    sidebar: (s) => {
      s.text('**Run Configuration**')
      s.spacer('sm')

      modelSelect = s.select('Model', [
        'gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet', 'llama-3.1-70b', 'mistral-7b',
      ], { default: 'gpt-4o-mini' })

      envSelect = s.select('Environment', [
        'production', 'staging', 'local',
      ], { default: 'staging' })

      s.divider({ label: 'Hyperparameters' })

      runParams = s.parameterPanel({
        batchSize:    { type: 'number', label: 'Batch size',    min: 1, max: 256, default: 32 },
        epochs:       { type: 'number', label: 'Epochs',        min: 1, max: 100, default: 5  },
        learningRate: { type: 'number', label: 'Learning rate', min: 0.0001, max: 0.1, step: 0.0001, default: 0.001 },
        dropout:      { type: 'number', label: 'Dropout',       min: 0, max: 0.9, step: 0.05, default: 0.1 },
        earlyStopping:{ type: 'boolean', label: 'Early stopping', default: true },
        seed:         { type: 'number', label: 'Random seed',   min: 0, max: 9999, default: 42 },
      })

      s.divider()

      s.button('Run experiment', async (btn) => {
        btn.setLoading(true)
        await startRun()
        btn.setLoading(false)
      }, { variant: 'primary' })

      s.button('Run ×5 parallel', async () => {
        // Fire and forget — 5 independent runs, no await
        for (let i = 0; i < 5; i++) {
          startRun()
          await new Promise((r) => setTimeout(r, 200)) // stagger slightly
        }
      }, { variant: 'secondary' })

      s.divider()

      const autoRefresh = s.toggle('Auto-refresh metrics', { default: true })
      ui.onDisconnect(() => clearInterval(refreshInterval))
      const refreshInterval = setInterval(() => {
        if (autoRefresh.value) refreshSummaryMetrics()
      }, 5000)
    },

    // ── Main — tabs: Queue / Results / Config ─────────────────────
    main: (m) => {
      m.tabs([
        {
          label: 'Queue',
          content: (t) => {
            // ── Summary metrics row ────────────────────────────────
            t.grid([
              (col) => { queueMetric   = col.metric('Queued',    '0') },
              (col) => { avgLatency    = col.metric('Avg latency', '—', { unit: 'ms' }) },
              (col) => { avgAccuracy   = col.metric('Avg accuracy', '—') },
              (col) => { totalTokens   = col.metric('Total tokens', '0') },
            ], { cols: 4, gap: 16 })

            t.spacer('sm')

            // ── Run queue table ────────────────────────────────────
            runTable = t.table([], {
              columns: ['ID', 'Model', 'Env', 'Batch', 'Epochs', 'Status', 'Accuracy', 'F1', 'Latency', 'Tokens'],
              maxHeight: 400,
              striped: true,
            })
          },
        },

        {
          label: 'Logs',
          content: (t) => {
            t.text('Select a run from the Queue tab to stream its logs here.')
            t.spacer('sm')

            t.grid([
              (left) => {
                activeRunSelect = left.select('Run', ['— none —'], { default: '— none —' })
              },
              (right) => {
                right.button('Clear logs', () => { logOutput.clear() }, { variant: 'ghost' })
              },
            ], { cols: ['1fr', 'auto'], gap: 8 })

            t.spacer('sm')
            logOutput = t.streamText({ format: 'plain', label: 'Live log output', maxHeight: 500 })
          },
        },

        {
          label: 'Results',
          content: (t) => {
            t.text('Completed runs. Sorted by accuracy (best first).')
            t.spacer('sm')
            resultsTable = t.table([], {
              columns: ['ID', 'Model', 'Accuracy', 'F1', 'Precision', 'Recall', 'Latency', 'Tokens'],
              sortable: true,
            })
          },
        },

        {
          label: 'Compare',
          content: (t) => {
            t.text('Side-by-side comparison of up to 3 completed runs.')
            t.spacer('sm')
            t.grid([
              (col) => {
                col.text('**Run A**')
                runASelect = col.select('Run A', ['— none —'])
                runAMetrics = col.table([], { columns: ['Metric', 'Value'] })
              },
              (col) => {
                col.text('**Run B**')
                runBSelect = col.select('Run B', ['— none —'])
                runBMetrics = col.table([], { columns: ['Metric', 'Value'] })
              },
              (col) => {
                col.text('**Run C**')
                runCSelect = col.select('Run C', ['— none —'])
                runCMetrics = col.table([], { columns: ['Metric', 'Value'] })
              },
            ], { cols: 3, gap: 16 })
          },
        },
      ])
    },

  }, { sidebarPosition: 'left', sidebarWidth: '300px' })

  // ── Hoist handles for cross-region access ─────────────────────────────
  let totalRuns:       ReturnType<typeof ui.metric>
  let runningCount:    ReturnType<typeof ui.metric>
  let doneCount:       ReturnType<typeof ui.metric>
  let failedCount:     ReturnType<typeof ui.metric>
  let bestAccuracy:    ReturnType<typeof ui.metric>
  let queueMetric:     ReturnType<typeof ui.metric>
  let avgLatency:      ReturnType<typeof ui.metric>
  let avgAccuracy:     ReturnType<typeof ui.metric>
  let totalTokens:     ReturnType<typeof ui.metric>
  let modelSelect:     ReturnType<typeof ui.select>
  let envSelect:       ReturnType<typeof ui.select>
  let runParams:       ReturnType<typeof ui.parameterPanel>
  let runTable:        ReturnType<typeof ui.table>
  let resultsTable:    ReturnType<typeof ui.table>
  let logOutput:       ReturnType<typeof ui.streamText>
  let activeRunSelect: ReturnType<typeof ui.select>
  let runASelect:      ReturnType<typeof ui.select>
  let runBSelect:      ReturnType<typeof ui.select>
  let runCSelect:      ReturnType<typeof ui.select>
  let runAMetrics:     ReturnType<typeof ui.table>
  let runBMetrics:     ReturnType<typeof ui.table>
  let runCMetrics:     ReturnType<typeof ui.table>

  // Track state
  const completedRuns: Array<{ id: string, config: RunConfig, result: RunResult }> = []
  let running = 0, done = 0, failed = 0

  // ── Core logic ─────────────────────────────────────────────────────────

  async function startRun(): Promise<void> {
    const id = `run-${String(++runCounter).padStart(3, '0')}`
    const config: RunConfig = {
      model:        modelSelect.value,
      environment:  envSelect.value,
      ...runParams.value as Omit<RunConfig, 'model' | 'environment'>,
    }

    // Add row immediately as 'queued'
    const row = runTable.prepend({
      ID: id, Model: config.model, Env: config.environment,
      Batch: config.batchSize, Epochs: config.epochs,
      Status: '⏳ queued', Accuracy: '—', F1: '—', Latency: '—', Tokens: '—',
    })

    // Refresh available runs in Compare tab selects
    refreshRunSelects(id)

    // Update header + queue metrics
    running++
    updateHeaderMetrics()
    updateQueueMetrics()

    row.update({ Status: '🔄 running' })

    // Stream logs in the background (fire and forget to log tab)
    streamRunLogs(id, config)

    // Run the experiment
    try {
      const result = await runExperiment(config)
      done++
      running--
      completedRuns.push({ id, config, result })

      row.update({
        Status:   '✅ done',
        Accuracy: result.accuracy.toFixed(4),
        F1:       result.f1.toFixed(4),
        Latency:  `${result.latencyMs.toFixed(0)}ms`,
        Tokens:   String(result.tokens),
      })

      // Add to results table
      resultsTable.prepend({
        ID:        id,
        Model:     config.model,
        Accuracy:  result.accuracy.toFixed(4),
        F1:        result.f1.toFixed(4),
        Precision: result.precision.toFixed(4),
        Recall:    result.recall.toFixed(4),
        Latency:   `${result.latencyMs.toFixed(0)}ms`,
        Tokens:    String(result.tokens),
      })

    } catch (err) {
      failed++
      running--
      row.update({ Status: '❌ failed' })
      ui.toast(`Run ${id} failed: ${String(err)}`, { type: 'error' })
    }

    updateHeaderMetrics()
    updateQueueMetrics()
  }

  async function streamRunLogs(id: string, config: RunConfig): Promise<void> {
    for await (const line of streamLogs(config)) {
      // Only write if this run is selected in the Logs tab
      if (activeRunSelect.value === id) {
        logOutput.append(line)
      }
    }
  }

  function updateHeaderMetrics(): void {
    const best = completedRuns.reduce((b, r) => Math.max(b, r.result.accuracy), 0)
    totalRuns.update(String(runCounter))
    runningCount.update(String(running))
    doneCount.update(String(done))
    failedCount.update(String(failed))
    bestAccuracy.update(done > 0 ? best.toFixed(4) : '—')
  }

  function updateQueueMetrics(): void {
    const pending = runTable.rowCount - done - failed
    const avgLat  = completedRuns.length
      ? (completedRuns.reduce((s, r) => s + r.result.latencyMs, 0) / completedRuns.length).toFixed(0)
      : '—'
    const avgAcc  = completedRuns.length
      ? (completedRuns.reduce((s, r) => s + r.result.accuracy, 0) / completedRuns.length).toFixed(4)
      : '—'
    const totTok  = completedRuns.reduce((s, r) => s + r.result.tokens, 0)

    queueMetric.update(String(pending))
    avgLatency.update(avgLat === '—' ? '—' : `${avgLat}ms`)
    avgAccuracy.update(avgAcc)
    totalTokens.update(String(totTok))
  }

  function refreshSummaryMetrics(): void {
    updateHeaderMetrics()
    updateQueueMetrics()
  }

  function refreshRunSelects(newId: string): void {
    const ids = ['— none —', ...completedRuns.map((r) => r.id), newId]
    activeRunSelect.update({ options: ids })
    runASelect.update({ options: ids })
    runBSelect.update({ options: ids })
    runCSelect.update({ options: ids })
  }
})
