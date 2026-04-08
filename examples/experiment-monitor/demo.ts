/**
 * Experiment Monitor — Complex Example
 *
 * A real-time experiment tracking dashboard.
 * Multiple experiment runs update the UI concurrently; background
 * processes push status updates independently of user actions.
 *
 * Demonstrates:
 *   ui.shell()        — header + sidebar + main layout
 *   ui.grid()         — metric summary row, card grid
 *   ui.table()        — experiment queue with live row updates
 *   ui.streamText()   — per-experiment log streaming
 *   ui.tabs()         — Queue / Logs / Results / Compare views
 *   ui.metric()       — live KPI counters in header
 *   ui.select()       — model and environment pickers
 *   ui.slider()       — hyperparameter controls
 *   ui.toggle()       — flags
 *   ui.progress()     — per-experiment progress
 *   Background push   — status updates arrive independently of buttons
 *   Fire-and-forget   — multiple parallel runs update the UI concurrently
 *   Cross-region spans — header metrics updated from main callbacks
 *
 * Note: parameterPanel and sortable tables are Phase 3 features.
 * This example uses Phase 2 equivalents (individual sliders/toggles).
 */

import { app } from 'lastriko'

// ── Types ──────────────────────────────────────────────────────────────────

type RunStatus = 'queued' | 'running' | 'done' | 'failed'

interface RunConfig {
  model:         string
  environment:   string
  batchSize:     number
  epochs:        number
  learningRate:  number
  earlyStopping: boolean
}

interface RunResult {
  accuracy:  number
  f1:        number
  latencyMs: number
  tokens:    number
}

// ── Mock runners ──────────────────────────────────────────────────────────

let runCounter = 0

async function* streamLogs(config: RunConfig): AsyncGenerator<string> {
  const steps = [
    `[init] Loading model ${config.model}...`,
    `[data] Preparing ${config.environment} dataset (batch=${config.batchSize})...`,
    `[train] epoch 1/${config.epochs} — loss: ${(Math.random() * 2).toFixed(4)}`,
    `[train] epoch 2/${config.epochs} — loss: ${(Math.random()).toFixed(4)}`,
    `[eval] Running evaluation on test split...`,
    `[result] accuracy=${(0.85 + Math.random() * 0.12).toFixed(4)}`,
    `[done] Run complete.\n`,
  ]
  for (const line of steps) {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600))
    yield line + '\n'
  }
}

async function runExperiment(config: RunConfig): Promise<RunResult> {
  await new Promise((r) => setTimeout(r, 2500 + Math.random() * 3500))
  return {
    accuracy:  0.85 + Math.random() * 0.12,
    f1:        0.82 + Math.random() * 0.14,
    latencyMs: 800  + Math.random() * 1200,
    tokens:    Math.floor(1000 + Math.random() * 3000),
  }
}

// ── App ───────────────────────────────────────────────────────────────────

app('Experiment Monitor', { theme: 'dark' }, (ui) => {

  // ── Declare ALL handles before ui.shell() to avoid temporal dead zone ──
  // These are assigned inside shell callbacks (which run synchronously
  // during app() execution). let declarations must precede the shell call.

  // Header handles
  let totalRuns:    ReturnType<typeof ui.metric>
  let runningCount: ReturnType<typeof ui.metric>
  let doneCount:    ReturnType<typeof ui.metric>
  let failedCount:  ReturnType<typeof ui.metric>
  let bestAccuracy: ReturnType<typeof ui.metric>

  // Sidebar handles
  let modelSelect:     ReturnType<typeof ui.select>
  let envSelect:       ReturnType<typeof ui.select>
  let batchSlider:     ReturnType<typeof ui.slider>
  let epochsSlider:    ReturnType<typeof ui.slider>
  let lrSlider:        ReturnType<typeof ui.slider>
  let earlyStop:       ReturnType<typeof ui.toggle>

  // Main handles
  let queueMetric:   ReturnType<typeof ui.metric>
  let avgLatency:    ReturnType<typeof ui.metric>
  let avgAccuracy:   ReturnType<typeof ui.metric>
  let totalTokens:   ReturnType<typeof ui.metric>
  let runTable:      ReturnType<typeof ui.table>
  let resultsTable:  ReturnType<typeof ui.table>
  let logOutput:     ReturnType<typeof ui.streamText>
  let activeRunSelect: ReturnType<typeof ui.select>
  let runASelect:    ReturnType<typeof ui.select>
  let runBSelect:    ReturnType<typeof ui.select>
  let runCSelect:    ReturnType<typeof ui.select>
  let runAMetrics:   ReturnType<typeof ui.table>
  let runBMetrics:   ReturnType<typeof ui.table>
  let runCMetrics:   ReturnType<typeof ui.table>

  // ── Shell ──────────────────────────────────────────────────────────────
  ui.shell({

    header: (h) => {
      h.text('**Experiment Monitor**')
      h.grid([
        (col) => { totalRuns    = col.metric('Total runs',   '0') },
        (col) => { runningCount = col.metric('Running',      '0') },
        (col) => { doneCount    = col.metric('Completed',    '0') },
        (col) => { failedCount  = col.metric('Failed',       '0') },
        (col) => { bestAccuracy = col.metric('Best accuracy','—') },
      ], { cols: 5, gap: 24 })
    },

    sidebar: (s) => {
      s.text('**Run Configuration**')
      s.spacer('sm')

      modelSelect = s.select('Model', [
        'gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet', 'llama-3.1-70b', 'mistral-7b',
      ], { default: 'gpt-4o-mini' })

      envSelect = s.select('Environment', ['production', 'staging', 'local'], { default: 'staging' })

      s.divider({ label: 'Hyperparameters' })

      batchSlider  = s.slider('Batch size',    { min: 1, max: 256, step: 1, default: 32 })
      epochsSlider = s.slider('Epochs',        { min: 1, max: 100, step: 1, default: 5 })
      lrSlider     = s.slider('Learning rate', { min: 0.0001, max: 0.1, step: 0.0001, default: 0.001 })
      earlyStop    = s.toggle('Early stopping', { default: true })

      s.divider()

      s.button('Run experiment', async (btn) => {
        btn.setLoading(true)
        await startRun()
        btn.setLoading(false)
      }, { variant: 'primary' })

      s.button('Run ×5 parallel', async () => {
        // Fire and forget — 5 independent runs, user can see all 5 progress
        for (let i = 0; i < 5; i++) {
          startRun()
          await new Promise((r) => setTimeout(r, 150))
        }
      }, { variant: 'secondary' })

      s.divider()

      const autoRefresh = s.toggle('Auto-refresh every 5s', { default: true })
      const refreshInterval = setInterval(() => {
        if (autoRefresh.value) refreshAllMetrics()
      }, 5000)
      ui.onDisconnect(() => clearInterval(refreshInterval))
    },

    main: (m) => {
      m.tabs([
        {
          label: 'Queue',
          content: (t) => {
            t.grid([
              (col) => { queueMetric = col.metric('Queued',       '0') },
              (col) => { avgLatency  = col.metric('Avg latency',  '—', { unit: 'ms' }) },
              (col) => { avgAccuracy = col.metric('Avg accuracy', '—') },
              (col) => { totalTokens = col.metric('Total tokens', '0') },
            ], { cols: 4, gap: 16 })

            t.spacer('sm')

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
            t.grid([
              (left) => {
                activeRunSelect = left.select('Run', ['— none —'], { default: '— none —' })
              },
              (right) => {
                right.button('Clear', () => { logOutput.clear() }, { variant: 'ghost' })
              },
            ], { cols: ['1fr', 'auto'], gap: 8 })

            t.spacer('sm')
            logOutput = t.streamText({ format: 'plain', label: 'Live log output', maxHeight: 500 })
          },
        },

        {
          label: 'Results',
          content: (t) => {
            t.text('Completed runs, newest first.')
            t.spacer('sm')
            resultsTable = t.table([], {
              columns: ['ID', 'Model', 'Accuracy', 'F1', 'Latency', 'Tokens'],
            })
          },
        },

        {
          label: 'Compare',
          content: (t) => {
            t.text('Side-by-side comparison of completed runs.')
            t.spacer('sm')
            t.grid([
              (col) => {
                col.text('**Run A**')
                runASelect  = col.select('Run A', ['— none —'])
                runAMetrics = col.table([], { columns: ['Metric', 'Value'] })
              },
              (col) => {
                col.text('**Run B**')
                runBSelect  = col.select('Run B', ['— none —'])
                runBMetrics = col.table([], { columns: ['Metric', 'Value'] })
              },
              (col) => {
                col.text('**Run C**')
                runCSelect  = col.select('Run C', ['— none —'])
                runCMetrics = col.table([], { columns: ['Metric', 'Value'] })
              },
            ], { cols: 3, gap: 16 })
          },
        },
      ])
    },

  }, { sidebarPosition: 'left', sidebarWidth: '300px' })

  // ── Shared state ───────────────────────────────────────────────────────
  const completedRuns: Array<{ id: string, config: RunConfig, result: RunResult }> = []
  let running = 0, done = 0, failed = 0

  // ── Core logic ─────────────────────────────────────────────────────────

  async function startRun(): Promise<void> {
    const id = `run-${String(++runCounter).padStart(3, '0')}`
    const config: RunConfig = {
      model:         modelSelect.value,
      environment:   envSelect.value,
      batchSize:     batchSlider.value,
      epochs:        epochsSlider.value,
      learningRate:  lrSlider.value,
      earlyStopping: earlyStop.value,
    }

    // Add row immediately as 'queued' — visible to user before work starts
    const row = runTable.prepend({
      ID: id, Model: config.model, Env: config.environment,
      Batch: config.batchSize, Epochs: config.epochs,
      Status: '⏳ queued', Accuracy: '—', F1: '—', Latency: '—', Tokens: '—',
    })

    refreshRunSelects(id)
    running++
    updateHeaderMetrics()
    updateQueueMetrics()

    row.update({ Status: '🔄 running' })

    // Stream logs independently (fire and forget — continues even if button already returned)
    streamRunLogs(id, config)

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

      resultsTable.prepend({
        ID:       id,
        Model:    config.model,
        Accuracy: result.accuracy.toFixed(4),
        F1:       result.f1.toFixed(4),
        Latency:  `${result.latencyMs.toFixed(0)}ms`,
        Tokens:   String(result.tokens),
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
    const pending  = runCounter - done - failed
    const avgLat   = completedRuns.length
      ? String(Math.round(completedRuns.reduce((s, r) => s + r.result.latencyMs, 0) / completedRuns.length))
      : '—'
    const avgAcc   = completedRuns.length
      ? (completedRuns.reduce((s, r) => s + r.result.accuracy, 0) / completedRuns.length).toFixed(4)
      : '—'
    const totTok   = completedRuns.reduce((s, r) => s + r.result.tokens, 0)

    queueMetric.update(String(pending))
    avgLatency.update(avgLat === '—' ? '—' : `${avgLat}ms`)
    avgAccuracy.update(avgAcc)
    totalTokens.update(String(totTok))
  }

  function refreshAllMetrics(): void {
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
