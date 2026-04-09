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
  const options = runStore.items.length > 0
    ? runStore.items.map((run) => {
        const label = `${run.id} · ${run.title}`;
        return { label, value: label };
      })
    : [{ label: 'No runs yet', value: '' }];
  refs.runSelector?.update({
    options,
    value: options[0]?.value ?? '',
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
