/**
 * From this folder: `npm install` then `npm run dev`.
 * Open the printed URL — a 3-page, goal-driven component demo.
 */
import type {
  ChatHandle,
  MetricHandle,
  ModelCompareHandle,
  ParameterPanelHandle,
  PromptEditorHandle,
  RowHandle,
  SelectHandle,
  SliderHandle,
  StreamHandle,
  TableHandle,
  TextHandle,
  UIContext,
} from 'lastriko';
import { app } from 'lastriko';

function demoSvg(bg: string, label: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="280" viewBox="0 0 560 280"><rect fill="${bg}" width="560" height="280" rx="16"/><text x="280" y="150" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="36">${label}</text></svg>`,
  )}`;
}

const IMG_INTAKE = demoSvg('#2563eb', 'Intake');
const IMG_DRAFT = demoSvg('#0f766e', 'Draft');
const IMG_REVIEW = demoSvg('#7c3aed', 'Review');
const DEMO_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const DEMO_AUDIO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3';

interface DraftRun {
  id: string;
  title: string;
  audience: string;
  style: string;
  model: string;
  temperature: number;
  status: 'queued' | 'running' | 'ready';
  score: string;
  summary: string;
  createdAt: string;
}

const runStore: {
  seq: number;
  items: DraftRun[];
} = {
  seq: 0,
  items: [],
};

const refs: {
  status: TextHandle | null;
  pageMetric: MetricHandle | null;
  modelMetric: MetricHandle | null;
  runMetric: MetricHandle | null;
  actionMetric: MetricHandle | null;
  modelSelect: SelectHandle | null;
  tempSlider: SliderHandle | null;
  notesText: TextHandle | null;
  streamOut: StreamHandle | null;
  chat: ChatHandle | null;
  prompt: PromptEditorHandle | null;
  draftTable: TableHandle | null;
  latestRow: RowHandle | null;
  runSelector: SelectHandle | null;
  compare: ModelCompareHandle | null;
  params: ParameterPanelHandle | null;
  reviewSummary: TextHandle | null;
} = {
  status: null,
  pageMetric: null,
  modelMetric: null,
  runMetric: null,
  actionMetric: null,
  modelSelect: null,
  tempSlider: null,
  notesText: null,
  streamOut: null,
  chat: null,
  prompt: null,
  draftTable: null,
  latestRow: null,
  runSelector: null,
  compare: null,
  params: null,
  reviewSummary: null,
};

function nowLabel(): string {
  const d = new Date();
  const wall = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${wall}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function setStatus(message: string): void {
  refs.status?.update(`${nowLabel()} · ${message}`);
  refs.actionMetric?.update(nowLabel());
}

function syncTopMetrics(activePage: string): void {
  refs.pageMetric?.update(activePage);
  refs.modelMetric?.update(refs.modelSelect?.value ?? 'gpt-4o');
  refs.runMetric?.update(String(runStore.items.length));
}

function rebuildRunSelector(): void {
  const labels = runStore.items.length > 0
    ? runStore.items.map((run) => `${run.id} · ${run.title}`)
    : ['No runs yet'];
  refs.runSelector?.update({
    options: labels,
    value: labels[0],
  });
}

function upsertDraftTableFromStore(): void {
  const table = refs.draftTable;
  if (!table) {
    return;
  }
  table.update({
    rows: runStore.items.map((run) => ({
      id: `row-${run.id}`,
      data: {
        id: run.id,
        title: run.title,
        model: run.model,
        status: run.status,
        score: run.score,
      },
    })),
  });
}

function updateReviewSummaryFromSelection(): void {
  const selected = refs.runSelector?.value ?? '';
  const runId = selected.split(' · ')[0] ?? '';
  const run = runStore.items.find((item) => item.id === runId);
  if (!run) {
    refs.reviewSummary?.update('Choose a run from the selector to inspect details.');
    return;
  }
  refs.reviewSummary?.update(
    `Selected ${run.id}: ${run.summary} (audience=${run.audience}, style=${run.style}, temp=${run.temperature.toFixed(1)}).`,
  );
}

function seedModelCompareForRun(run: DraftRun): void {
  const compare = refs.compare;
  if (!compare) {
    return;
  }
  const next = {
    results: { ...compare.value.results },
    isStreaming: { ...compare.value.isStreaming },
    errors: { ...compare.value.errors },
    latencies: { ...compare.value.latencies },
  };
  const labels = Object.keys(next.results);
  for (const [index, label] of labels.entries()) {
    next.results[label] = `${label}: ${run.summary.slice(0, 120)}...`;
    next.isStreaming[label] = false;
    next.errors[label] = label.includes('Llama') ? 'Demo partial failure (timeout)' : null;
    next.latencies[label] = 110 + index * 95;
  }
  compare.update({ value: next });
}

await app(
  'Lastriko component gallery',
  (ui: UIContext) => {
    ui.shell({
      header: (h: UIContext) => {
        h.text('Component gallery — 3 functional pages (increasing complexity)');
        h.button('Toggle theme', () => {
          h.setTheme(h.theme === 'dark' ? 'light' : 'dark');
          setStatus(`Theme switched to ${h.theme === 'dark' ? 'light' : 'dark'}`);
        });
        h.button('Toast demo', () => {
          h.toast('Gallery action executed', { type: 'info', duration: 1800 });
          setStatus('Toast sent.');
        });
        refs.status = h.text('Ready. Use the 3 pages to execute an end-to-end content workflow.');
      },
      sidebar: (s: UIContext) => {
        s.markdown('### Global run controls\nThese values are reused by all pages.');
        refs.modelSelect = s.select('Primary model', ['gpt-4o', 'claude-3.5', 'llama-3.1']);
        refs.tempSlider = s.slider('Temperature', { min: 0, max: 2, step: 0.1, default: 0.7 });
        const campaignDate = s.dateInput('Campaign date', { default: '2026-04-09' });
        const audienceTags = s.multiSelect(
          'Audience tags',
          ['founders', 'engineers', 'designers', 'operators'],
          { defaults: ['founders', 'engineers'] },
        );
        const accent = s.colorPicker('Accent hint', {
          default: '#2563eb',
          swatches: ['#2563eb', '#7c3aed', '#dc2626', '#0f766e'],
        });
        s.button('Apply global settings', () => {
          syncTopMetrics('Workflow');
          setStatus(
            `Global settings applied: model=${refs.modelSelect?.value}, temp=${(refs.tempSlider?.value ?? 0).toFixed(1)}, date=${campaignDate.value}, tags=${audienceTags.value.join(',') || 'none'}, accent=${accent.value}`,
          );
        });
        s.divider({ label: 'Cross-page actions' });
        s.button('Seed stream text', async () => {
          const stream = refs.streamOut;
          if (!stream) {
            return;
          }
          stream.clear();
          for (const token of ['Synthesizing', 'draft', 'from', 'current', 'controls', '...']) {
            stream.append(`${token} `);
            await new Promise((resolve) => setTimeout(resolve, 80));
          }
          stream.done();
          setStatus('Stream demo finished.');
        });
        s.button('Sync selected run to review', () => {
          updateReviewSummaryFromSelection();
          setStatus('Review summary synced from current run selection.');
        });
        s.spacer('sm');
        s.loading('Sidebar activity', { mode: 'inline', size: 'sm' });
      },
      main: (m: UIContext) => {
        m.markdown(
          '## Purposeful demo\nThis gallery models a **content workflow**: 1) Intake, 2) Draft generation, 3) Review & publish.',
        );
        m.grid(
          [
            (cell: UIContext) => { refs.pageMetric = cell.metric('Active section', 'Intake'); },
            (cell: UIContext) => { refs.modelMetric = cell.metric('Model', refs.modelSelect?.value ?? 'gpt-4o'); },
            (cell: UIContext) => { refs.runMetric = cell.metric('Draft runs', String(runStore.items.length)); },
            (cell: UIContext) => { refs.actionMetric = cell.metric('Last action', '—'); },
          ],
          { cols: 2, gap: 12 },
        );

        m.tabs(
          [
            {
              label: '1) Intake',
              content: (page: UIContext) => {
                syncTopMetrics('Intake');
                page.card('Goal: capture a marketing brief', (c: UIContext) => {
                  const title = c.textInput('Campaign title', {
                    default: 'Spring launch',
                    placeholder: 'Name your campaign',
                  });
                  const audience = c.select('Audience', ['Founders', 'Developers', 'Growth teams']);
                  const style = c.select('Style', ['Concise', 'Detailed', 'Bullet list']);
                  const constraints = c.multiSelect(
                    'Constraints',
                    ['No hype', 'Include CTA', 'Mention timeline', 'Max 120 words'],
                    { defaults: ['Include CTA', 'Mention timeline'] },
                  );
                  const notes = c.promptEditor({
                    label: 'Notes template',
                    default: 'Draft for {{audience}} with {{style}} tone.',
                    variables: ['audience', 'style'],
                  });
                  refs.notesText = c.text('No brief submitted yet.');
                  c.button('Submit brief', () => {
                    const rendered = notes.interpolate({
                      audience: audience.value.toLowerCase(),
                      style: style.value.toLowerCase(),
                    });
                    refs.notesText?.update(
                      `Brief: "${title.value}" for ${audience.value}. Constraints=${constraints.value.join(', ') || 'none'}. ${rendered}`,
                    );
                    setStatus('Intake brief captured.');
                  });
                });
                page.grid(
                  [
                    (cell: UIContext) => {
                      cell.image(IMG_INTAKE, { alt: 'Intake stage', caption: 'Input assets' });
                    },
                    (cell: UIContext) => {
                      cell.diff(
                        'Draft: ship a product update.',
                        'Draft: ship a product update with CTA and release date.',
                        { mode: 'split', beforeLabel: 'Original', afterLabel: 'Refined' },
                      );
                    },
                  ],
                  { cols: 2, gap: 12 },
                );
              },
            },
            {
              label: '2) Draft generation',
              content: (page: UIContext) => {
                syncTopMetrics('Draft generation');
                refs.streamOut = page.streamText({ format: 'plain', cursor: true, label: 'Generation stream' });
                refs.chat = page.chatUI({ maxHeight: 220 });
                refs.chat.addMessage('assistant', 'Draft assistant ready. Run a generation to append outputs.');

                page.button('Run draft generation', async () => {
                  runStore.seq += 1;
                  const id = `run-${String(runStore.seq).padStart(3, '0')}`;
                  const model = refs.modelSelect?.value ?? 'gpt-4o';
                  const temp = refs.tempSlider?.value ?? 0.7;
                  const run: DraftRun = {
                    id,
                    title: `Campaign ${runStore.seq}`,
                    audience: 'Founders',
                    style: 'Concise',
                    model,
                    temperature: temp,
                    status: 'queued',
                    score: '—',
                    summary: `Generated draft ${runStore.seq} using ${model}`,
                    createdAt: nowLabel(),
                  };
                  runStore.items.unshift(run);
                  upsertDraftTableFromStore();
                  rebuildRunSelector();
                  syncTopMetrics('Draft generation');
                  setStatus(`${id} queued.`);

                  run.status = 'running';
                  upsertDraftTableFromStore();
                  refs.streamOut?.clear();
                  for (const token of ['Generating', 'headline', 'and', 'body', 'content', `for ${id}`]) {
                    refs.streamOut?.append(`${token} `);
                    await new Promise((resolve) => setTimeout(resolve, 70));
                  }
                  refs.streamOut?.done();

                  run.status = 'ready';
                  run.score = (0.78 + Math.random() * 0.2).toFixed(2);
                  run.summary = `Draft ${id} ready for review (score=${run.score})`;
                  upsertDraftTableFromStore();
                  refs.latestRow?.update({
                    status: 'ready',
                    score: run.score,
                  });
                  refs.chat?.addMessage('user', `Please summarize ${id}`);
                  refs.chat?.addMessage('assistant', run.summary);
                  setStatus(`${id} completed.`);
                });

                refs.draftTable = page.table([], {
                  columns: ['id', 'title', 'model', 'status', 'score'],
                  striped: true,
                  maxHeight: 260,
                  emptyMessage: 'No runs yet',
                });
                refs.draftTable.onRowClick((row) => {
                  const selected = String(row.id ?? '');
                  const run = runStore.items.find((item) => item.id === selected);
                  if (!run) {
                    return;
                  }
                  refs.chat?.addMessage('assistant', `Selected ${run.id}: ${run.summary}`);
                  setStatus(`Selected ${run.id} from table.`);
                });
                refs.latestRow = refs.draftTable.prepend({
                  id: 'example',
                  title: 'Reference run',
                  model: 'gpt-4o',
                  status: 'ready',
                  score: '0.91',
                });
                upsertDraftTableFromStore();
              },
            },
            {
              label: '3) Review & publish',
              content: (page: UIContext) => {
                syncTopMetrics('Review & publish');
                page.markdown('Goal: compare model outputs, tune params, and approve a final draft.');
                refs.runSelector = page.select('Select run', ['No runs yet']);
                refs.reviewSummary = page.text('Choose a run from the selector to inspect details.');

                refs.params = page.parameterPanel(
                  {
                    temperature: { type: 'number', min: 0, max: 2, step: 0.1, default: 0.7 },
                    maxTokens: { type: 'number', min: 64, max: 512, step: 16, default: 192 },
                    includeCTA: { type: 'boolean', default: true },
                    tone: { type: 'select', options: ['concise', 'detailed', 'bullet'], default: 'concise' },
                  },
                  { title: 'Review parameters', collapsible: true },
                );
                refs.compare = page.modelCompare(
                  [
                    { label: 'GPT-4o', provider: 'openai', model: 'gpt-4o', color: '#2563eb' },
                    { label: 'Claude 3.5', provider: 'anthropic', model: 'claude-3-5-sonnet', color: '#7c3aed' },
                    { label: 'Llama 3.1', provider: 'ollama', model: 'llama3.1', color: '#d97706' },
                  ],
                  {
                    prompt: 'Review and rewrite this draft.',
                    temperature: 0.7,
                    maxTokens: 256,
                    streaming: true,
                  },
                );

                page.grid(
                  [
                    (cell: UIContext) => {
                      cell.filmStrip(
                        [
                          { src: IMG_INTAKE, alt: 'Intake', caption: 'Brief' },
                          { src: IMG_DRAFT, alt: 'Draft', caption: 'Generated draft' },
                          { src: IMG_REVIEW, alt: 'Review', caption: 'Final review' },
                        ],
                        { selectedIndex: 1, showCaptions: true, height: 96 },
                      );
                    },
                    (cell: UIContext) => {
                      cell.beforeAfter(IMG_DRAFT, IMG_REVIEW, {
                        beforeLabel: 'Draft',
                        afterLabel: 'Published',
                        initialPosition: 52,
                      });
                    },
                  ],
                  { cols: 2, gap: 12 },
                );

                page.video(DEMO_VIDEO, {
                  src: DEMO_VIDEO,
                  controls: true,
                  muted: true,
                  caption: 'Optional review artifact (video)',
                });
                page.audio(DEMO_AUDIO, {
                  src: DEMO_AUDIO,
                  controls: true,
                  label: 'Voice-over preview',
                });

                page.button('Run model comparison for selected run', () => {
                  const selected = refs.runSelector?.value ?? '';
                  const runId = selected.split(' · ')[0] ?? '';
                  const run = runStore.items.find((item) => item.id === runId);
                  if (!run) {
                    setStatus('No run selected yet for model comparison.');
                    return;
                  }
                  seedModelCompareForRun(run);
                  refs.reviewSummary?.update(
                    `Compared outputs for ${run.id}. Params=${JSON.stringify(refs.params?.value ?? {})}`,
                  );
                  setStatus(`Model comparison populated for ${run.id}.`);
                });
                page.button('Approve selected run', () => {
                  const selected = refs.runSelector?.value ?? '';
                  const runId = selected.split(' · ')[0] ?? '';
                  const run = runStore.items.find((item) => item.id === runId);
                  if (!run) {
                    setStatus('No run selected for approval.');
                    return;
                  }
                  run.status = 'ready';
                  run.score = (0.9 + Math.random() * 0.09).toFixed(2);
                  upsertDraftTableFromStore();
                  refs.reviewSummary?.update(
                    `Approved ${run.id} with score ${run.score}. Ready to publish.`,
                  );
                  setStatus(`${run.id} approved for publish.`);
                });
                rebuildRunSelector();
                updateReviewSummaryFromSelection();
              },
            },
          ],
          { defaultTab: '1) Intake' },
        );
      },
      footer: (f: UIContext) => {
        f.divider({ label: 'Assets upload' });
        f.text('Upload optional source files used in the workflow.');
        f.fileUpload('Upload content assets', {
          accept: '.txt,.md,.json,.csv,.png,.jpg',
          maxSize: 4 * 1024 * 1024,
        });
      },
    });

    syncTopMetrics('Intake');
  },
  { server: { port: 3500 } },
);
/**
 * From this folder: `npm install` then `npm run dev`.
 * Open the printed URL — complete Phase 2 + Phase 3 component gallery.
 */
import type {
  ChatHandle,
  ColorPickerHandle,
  DateInputHandle,
  FullscreenHandle,
  MetricHandle,
  ModelCompareHandle,
  MultiSelectHandle,
  ParameterPanelHandle,
  PromptEditorHandle,
  RowHandle,
  SelectHandle,
  SliderHandle,
  StreamHandle,
  TableHandle,
  TextHandle,
  UIContext,
} from 'lastriko';
import { app } from 'lastriko';

function demoSvg(bg: string, label: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="240" viewBox="0 0 420 240"><rect fill="${bg}" width="420" height="240" rx="16"/><text x="210" y="132" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="34">${label}</text></svg>`,
  )}`;
}

const IMG_A = demoSvg('#2563eb', 'Input');
const IMG_B = demoSvg('#0f766e', 'Output');
const IMG_C = demoSvg('#d97706', 'Compare');

const DEMO_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const DEMO_AUDIO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3';

const refs: {
  model: SelectHandle | null;
  temperature: SliderHandle | null;
  selectedFeatures: MultiSelectHandle | null;
  accentColor: ColorPickerHandle | null;
  releaseDate: DateInputHandle | null;
  notes: string;
  verbose: boolean;
  batchSize: number;
  demoTable: TableHandle | null;
  liveRow: RowHandle | null;
  streamOut: StreamHandle | null;
  chat: ChatHandle | null;
  prompt: PromptEditorHandle | null;
  status: TextHandle | null;
  story: TextHandle | null;
  fullscreen: FullscreenHandle | null;
  modelCompare: ModelCompareHandle | null;
  parameterPanel: ParameterPanelHandle | null;
  metricModel: MetricHandle | null;
  metricTemp: MetricHandle | null;
  metricRows: MetricHandle | null;
  metricLastAction: MetricHandle | null;
} = {
  model: null,
  temperature: null,
  selectedFeatures: null,
  accentColor: null,
  releaseDate: null,
  notes: '',
  verbose: false,
  batchSize: 8,
  demoTable: null,
  liveRow: null,
  streamOut: null,
  chat: null,
  prompt: null,
  status: null,
  story: null,
  fullscreen: null,
  modelCompare: null,
  parameterPanel: null,
  metricModel: null,
  metricTemp: null,
  metricRows: null,
  metricLastAction: null,
};

function nowLabel(): string {
  const d = new Date();
  const wall = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${wall}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function setStatus(message: string): void {
  refs.status?.update(`${nowLabel()} · ${message}`);
  refs.metricLastAction?.update(nowLabel());
}

function syncSummaryMetrics(): void {
  refs.metricModel?.update(refs.model?.value ?? '—');
  refs.metricTemp?.update((refs.temperature?.value ?? 0).toFixed(1));
  refs.metricRows?.update(String(refs.demoTable?.rowCount ?? 0));
}

function seedModelCompareFromPrompt(): void {
  const compare = refs.modelCompare;
  if (!compare) {
    return;
  }
  const prompt = refs.prompt?.value ?? 'demo prompt';
  const next = {
    results: { ...compare.value.results },
    isStreaming: { ...compare.value.isStreaming },
    errors: { ...compare.value.errors },
    latencies: { ...compare.value.latencies },
  };
  const labels = Object.keys(next.results);
  for (const [index, label] of labels.entries()) {
    next.results[label] = `${label}: simulated output for "${prompt.slice(0, 28)}"`;
    next.isStreaming[label] = false;
    next.errors[label] = label.includes('Llama') ? 'Demo partial error: upstream timeout' : null;
    next.latencies[label] = 140 + index * 90;
  }
  compare.update({ value: next });
  setStatus('modelCompare updated: two successes + one simulated error.');
}

await app(
  'Lastriko component gallery',
  (ui: UIContext) => {
    ui.shell({
      header: (h: UIContext) => {
        h.text('Lastriko component gallery — complete Phase 2 + 3 showcase');
        h.button('Toggle theme', () => {
          h.setTheme(h.theme === 'dark' ? 'light' : 'dark');
          setStatus(`Theme switched to ${h.theme === 'dark' ? 'light' : 'dark'}`);
        });
        h.button('Header ping', () => {
          setStatus('Header action executed and FRAGMENT delivered.');
        });
        h.button('Toast demo', () => {
          h.toast('Demo toast sent over WebSocket', { type: 'info', duration: 2200 });
          setStatus('TOAST message sent.');
        });
        refs.status = h.text('Ready. Navigate tabs to inspect every available component.');
      },
      sidebar: (s: UIContext) => {
        s.markdown('### Global controls\nThese drive metrics and cross-page demo actions.');
        refs.model = s.select('Primary model', ['gpt-4o', 'claude-3.5', 'llama-3.1']);
        refs.temperature = s.slider('Temperature', { min: 0, max: 2, step: 0.1, default: 0.7 });
        refs.selectedFeatures = s.multiSelect(
          'Enabled features',
          ['streaming', 'vision', 'tools', 'reasoning'],
          { defaults: ['streaming', 'tools'] },
        );
        refs.accentColor = s.colorPicker('Theme accent preview', {
          default: '#2563eb',
          swatches: ['#2563eb', '#7c3aed', '#dc2626', '#0f766e'],
        });
        refs.releaseDate = s.dateInput('Release date', { default: '2026-04-08', type: 'date' });
        const verbose = s.toggle('Verbose mode', { default: false });
        const notes = s.textInput('Notes', { default: '', placeholder: 'Optional note...' });
        const batch = s.numberInput('Batch size', { min: 1, max: 128, default: 8 });

        s.button('Apply global controls', () => {
          refs.verbose = verbose.value;
          refs.notes = notes.value;
          refs.batchSize = batch.value;
          syncSummaryMetrics();
          setStatus(
            `Applied controls · model=${refs.model?.value} temp=${(refs.temperature?.value ?? 0).toFixed(1)} batch=${refs.batchSize}`,
          );
        });

        s.divider({ label: 'Cross-page actions' });
        s.button('Seed modelCompare', () => {
          seedModelCompareFromPrompt();
        });
        s.button('Open fullscreen demo', () => {
          refs.fullscreen?.open();
          setStatus('Fullscreen opened programmatically.');
        });
        s.button('Close fullscreen demo', () => {
          refs.fullscreen?.close();
          setStatus('Fullscreen closed programmatically.');
        });
        s.button('Run stream demo', async () => {
          const out = refs.streamOut;
          if (!out) {
            return;
          }
          out.clear();
          for (const token of ['Streaming', 'demo', 'via', 'append()', 'then', 'done().']) {
            out.append(`${token} `);
            await new Promise((resolve) => setTimeout(resolve, 90));
          }
          out.done();
          setStatus('streamText demo completed.');
        });
        s.button('Send chat demo', () => {
          const model = refs.model?.value ?? 'gpt-4o';
          refs.chat?.addMessage('user', `Demo question for ${model}`);
          refs.chat?.addMessage('assistant', `Demo answer generated at ${nowLabel()}.`);
          setStatus('chatUI updated with demo user + assistant messages.');
        });
        s.spacer('sm');
        s.loading('Sidebar activity', { mode: 'inline', size: 'sm' });
      },
      main: (m: UIContext) => {
        m.markdown(
          '## Gallery\nThis demo is organized into tabbed pages and includes every Phase 2 + Phase 3 component with functional actions.',
        );

        m.grid(
          [
            (cell: UIContext) => { refs.metricModel = cell.metric('Model', refs.model?.value ?? 'gpt-4o'); },
            (cell: UIContext) => { refs.metricTemp = cell.metric('Temperature', String(refs.temperature?.value ?? 0.7)); },
            (cell: UIContext) => { refs.metricRows = cell.metric('Table rows', String(refs.demoTable?.rowCount ?? 0)); },
            (cell: UIContext) => { refs.metricLastAction = cell.metric('Last action', '—'); },
          ],
          { cols: 2, gap: 12 },
        );

        m.tabs(
          [
            {
              label: 'Inputs & Controls',
              content: (t: UIContext) => {
                t.card('Input components', (c: UIContext) => {
                  const expName = c.textInput('Experiment name', { default: 'baseline-run' });
                  const retries = c.numberInput('Retries', { min: 0, max: 10, default: 2 });
                  const urgent = c.toggle('High priority', { default: false });
                  const engine = c.select('Engine', ['cpu', 'gpu', 'tpu']);
                  c.button('Use local controls', () => {
                    setStatus(
                      `Inputs page action · name=${expName.value} retries=${retries.value} urgent=${String(urgent.value)} engine=${engine.value}`,
                    );
                  });
                });
                t.alert('Input actions update status in the shell header.', {
                  type: 'info',
                  title: 'Tip',
                });
                t.progress(65, { label: 'Determinate progress' });
                t.progress(null, { label: 'Indeterminate progress' });
              },
            },
            {
              label: 'Display & Media',
              content: (t: UIContext) => {
                t.card('Display primitives', (c: UIContext) => {
                  refs.story = c.text('text() returns a handle and can be updated live.');
                  c.markdown('`markdown`, `code`, `json`, `image`, `imageGrid`, `video`, `audio`, and `diff` are rendered below.');
                  c.code('const output = ui.streamText({ format: "markdown" })', { lang: 'typescript' });
                  c.json(
                    {
                      model: refs.model?.value ?? 'gpt-4o',
                      temperature: refs.temperature?.value ?? 0.7,
                      features: refs.selectedFeatures?.value ?? [],
                    },
                    { label: 'Current configuration snapshot' },
                  );
                  c.image(IMG_A, { alt: 'Input stage', caption: 'Single image component' });
                  c.imageGrid(
                    [
                      { src: IMG_A, alt: 'Input', caption: 'Tile A' },
                      { src: IMG_B, alt: 'Output', caption: 'Tile B' },
                      { src: IMG_C, alt: 'Compare', caption: 'Tile C' },
                    ],
                    { cols: 3, gap: 8 },
                  );
                  c.video(DEMO_VIDEO, {
                    src: DEMO_VIDEO,
                    controls: true,
                    muted: true,
                    caption: 'video() with lazy loading',
                  });
                  c.audio(DEMO_AUDIO, {
                    src: DEMO_AUDIO,
                    controls: true,
                    label: 'Demo audio player',
                  });
                  c.diff('line-a\nline-b\nline-c', 'line-a\nline-b-updated\nline-c', {
                    mode: 'split',
                    beforeLabel: 'Before',
                    afterLabel: 'After',
                  });
                });
                t.button('Update text() handle', () => {
                  refs.story?.update(`Updated from Display page at ${nowLabel()}.`);
                  setStatus('text() handle updated from Display page.');
                });
              },
            },
            {
              label: 'Layout & Containers',
              content: (t: UIContext) => {
                t.grid(
                  [
                    (cell: UIContext) => {
                      cell.card('Nested layout', (card: UIContext) => {
                        card.text('grid + card + tabs composition');
                        card.tabs(
                          [
                            { label: 'Alpha', content: (tab) => tab.text('Tab Alpha content') },
                            { label: 'Beta', content: (tab) => tab.text('Tab Beta content') },
                          ],
                          { defaultTab: 'Alpha' },
                        );
                      });
                    },
                    (cell: UIContext) => {
                      cell.accordion(
                        [
                          {
                            label: 'Section 1',
                            defaultOpen: true,
                            content: (a: UIContext) => {
                              a.text('accordion() section with functional action.');
                              a.button('Accordion action', () => {
                                setStatus('Accordion button clicked.');
                              });
                            },
                          },
                          {
                            label: 'Section 2',
                            content: (a: UIContext) => {
                              a.markdown('Second section with `markdown()` content.');
                            },
                          },
                        ],
                        { allowMultiple: true },
                      );
                    },
                  ],
                  { cols: 2, gap: 12 },
                );

                refs.fullscreen = t.fullscreen(
                  (f: UIContext) => {
                    f.markdown('### Fullscreen component\nThis content is rendered inside the modal overlay.');
                    f.button('Close inside fullscreen', () => {
                      refs.fullscreen?.close();
                      setStatus('Fullscreen closed from inside modal content.');
                    });
                  },
                  { trigger: 'button', label: 'Open fullscreen panel' },
                );

                t.button('Toggle fullscreen programmatically', () => {
                  if (refs.fullscreen?.value) {
                    refs.fullscreen.close();
                    setStatus('Fullscreen closed via toggle button.');
                    return;
                  }
                  refs.fullscreen?.open();
                  setStatus('Fullscreen opened via toggle button.');
                });
              },
            },
            {
              label: 'AI & Advanced',
              content: (t: UIContext) => {
                refs.streamOut = t.streamText({ format: 'plain', cursor: true, label: 'streamText demo' });
                t.button('Clear stream output', () => {
                  refs.streamOut?.clear();
                  setStatus('streamText cleared.');
                });

                refs.chat = t.chatUI({ maxHeight: 220 });
                refs.chat.addMessage('assistant', 'chatUI ready. Use sidebar actions or prompt actions.');
                refs.prompt = t.promptEditor({
                  label: 'Prompt template',
                  default: 'Summarize this run for {{model}} in {{style}} style.',
                  variables: ['model', 'style'],
                });
                t.button('Apply prompt to chat', () => {
                  const text = refs.prompt?.interpolate({
                    model: refs.model?.value ?? 'gpt-4o',
                    style: 'concise',
                  }) ?? '';
                  refs.chat?.addMessage('assistant', text);
                  setStatus('Prompt interpolated and appended to chat.');
                });

                refs.modelCompare = t.modelCompare(
                  [
                    { label: 'GPT-4o', provider: 'openai', model: 'gpt-4o', color: '#2563eb' },
                    { label: 'Claude 3.5', provider: 'anthropic', model: 'claude-3-5-sonnet', color: '#7c3aed' },
                    { label: 'Llama 3.1', provider: 'ollama', model: 'llama3.1', color: '#d97706' },
                  ],
                  {
                    prompt: 'Compare these model outputs.',
                    temperature: 0.7,
                    maxTokens: 256,
                    streaming: true,
                  },
                );

                refs.parameterPanel = t.parameterPanel(
                  {
                    temperature: { type: 'number', min: 0, max: 2, step: 0.1, default: 0.7 },
                    topP: { type: 'number', min: 0, max: 1, step: 0.05, default: 0.9 },
                    streaming: { type: 'boolean', default: true },
                    style: { type: 'select', options: ['concise', 'detailed', 'bullet'], default: 'concise' },
                  },
                  { title: 'Parameter panel', collapsible: true },
                );

                t.button('Sync parameterPanel values', () => {
                  const values = refs.parameterPanel?.value as Record<string, unknown> | undefined;
                  setStatus(`parameterPanel values: ${JSON.stringify(values ?? {})}`);
                });
                t.button('Mutate parameterPanel demo values', () => {
                  refs.parameterPanel?.update({
                    value: {
                      temperature: 1.2,
                      topP: 0.75,
                      streaming: false,
                      style: 'detailed',
                    },
                  });
                  setStatus('parameterPanel updated programmatically.');
                });

                t.filmStrip(
                  [
                    { src: IMG_A, alt: 'Input frame', caption: 'Input' },
                    { src: IMG_B, alt: 'Output frame', caption: 'Output' },
                    { src: IMG_C, alt: 'Compare frame', caption: 'Compare' },
                  ],
                  { selectedIndex: 1, showCaptions: true, height: 96 },
                );
                t.beforeAfter(IMG_A, IMG_B, {
                  beforeLabel: 'Input',
                  afterLabel: 'Output',
                  initialPosition: 55,
                });
              },
            },
            {
              label: 'Data Table',
              content: (t: UIContext) => {
                const rows = Array.from({ length: 220 }, (_, i) => ({
                  name: `run-${i + 1}`,
                  status: i % 3 === 0 ? 'done' : i % 3 === 1 ? 'queued' : 'running',
                  score: (0.52 + ((i % 40) / 100)).toFixed(2),
                }));
                refs.demoTable = t.table(rows, {
                  columns: ['name', 'status', 'score'],
                  striped: true,
                  maxHeight: 260,
                  emptyMessage: 'No rows',
                });
                refs.liveRow = refs.demoTable.prepend({ name: 'live-row', status: 'new', score: '1.00' });
                refs.demoTable.onRowClick((row) => {
                  setStatus(`Table row clicked: ${String(row.name ?? '')}`);
                });

                t.button('Append table row', () => {
                  const table = refs.demoTable;
                  if (!table) {
                    return;
                  }
                  table.append({
                    name: `run-${table.rowCount + 1}`,
                    status: 'new',
                    score: (0.5 + Math.random() * 0.49).toFixed(2),
                  });
                  syncSummaryMetrics();
                  setStatus(`Appended row. Table now has ${table.rowCount} rows.`);
                });
                t.button('Update live row handle', () => {
                  refs.liveRow?.update({ status: 'done', score: '0.99' });
                  setStatus('Updated live row via TableRowHandle.update().');
                });
                t.button('Remove first table row', () => {
                  const table = refs.demoTable;
                  const rowId = table?.props.rows[0]?.id;
                  if (!table || !rowId) {
                    return;
                  }
                  table.remove(rowId);
                  syncSummaryMetrics();
                  setStatus(`Removed row ${rowId}.`);
                });
              },
            },
          ],
          { defaultTab: 'Inputs & Controls' },
        );

        m.spacer('md');
        m.markdown(
          'Use `?debug=1` to inspect protocol messages (`RENDER`, `FRAGMENT`, `BATCH`, `STREAM_CHUNK`) in DevTools.',
        );
      },
      footer: (f: UIContext) => {
        f.divider({ label: 'Uploads' });
        f.text('fileUpload uses POST /upload and reports metadata back to the server.');
        f.fileUpload('Upload sample file', { accept: '.txt,.json,.md', maxSize: 2 * 1024 * 1024 });
      },
    });

    syncSummaryMetrics();
  },
  { server: { port: 3500 } },
);
