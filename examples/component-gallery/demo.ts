/**
 * From this folder: `npm install` then `npm run dev`.
 * Open the printed URL — a walkthrough of Phase 1 + Phase 2 components.
 */
import type {
  ChatHandle,
  MetricHandle,
  PromptEditorHandle,
  RowHandle,
  SelectHandle,
  SliderHandle,
  StreamHandle,
  TableHandle,
  TableRow,
  TextHandle,
  UIContext,
} from 'lastriko';
import { app } from 'lastriko';

const DEMO_IMG =
  `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"><rect fill="#3b82f6" width="160" height="100" rx="6"/><text x="80" y="56" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="13">Lastriko</text></svg>',
  )}`;

const refs: {
  model: SelectHandle | null;
  temperature: SliderHandle | null;
  notes: string;
  verbose: boolean;
  batchSize: number;
  demoTable: TableHandle | null;
  firstRow: RowHandle | null;
  streamOut: StreamHandle | null;
  chat: ChatHandle | null;
  prompt: PromptEditorHandle | null;
  status: TextHandle | null;
  metricModel: MetricHandle | null;
  metricTemp: MetricHandle | null;
  metricRows: MetricHandle | null;
  metricLastAction: MetricHandle | null;
} = {
  model: null,
  temperature: null,
  notes: '',
  verbose: false,
  batchSize: 8,
  demoTable: null,
  firstRow: null,
  streamOut: null,
  chat: null,
  prompt: null,
  status: null,
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
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${wall}.${ms}`;
}

function setStatus(message: string): void {
  refs.status?.update(`${nowLabel()} · ${message}`);
  refs.metricLastAction?.update(nowLabel());
}

function syncSummaryMetrics(): void {
  const model = refs.model?.value ?? '—';
  const temp = refs.temperature?.value ?? 0;
  const rows = refs.demoTable?.rowCount ?? 0;
  refs.metricModel?.update(model);
  refs.metricTemp?.update(temp.toFixed(1));
  refs.metricRows?.update(String(rows));
}

await app(
  'Lastriko component gallery',
  (ui: UIContext) => {
    ui.shell({
      header: (h: UIContext) => {
        h.text('Lastriko component gallery — practical Phase 2 walkthrough');
        h.button('Toggle theme', () => {
          h.setTheme(h.theme === 'dark' ? 'light' : 'dark');
          setStatus(`Theme switched to ${h.theme === 'dark' ? 'light' : 'dark'}`);
        });
        h.button('Ping FRAGMENT', () => {
          setStatus('Header Ping triggered a fresh FRAGMENT update.');
        });
        h.button('Toast transport', () => {
          h.toast('Toast event emitted', { type: 'info', duration: 2200 });
          setStatus('TOAST message sent (watch DevTools with ?debug=1).');
        });
        refs.status = h.text(
          'Ready. Use sidebar actions to drive table, stream, chat, and metrics.',
        );
      },
      sidebar: (s: UIContext) => {
        s.markdown(
          '### Controls\nInputs update server-side values; actions below mutate main-region components.',
        );
        refs.model = s.select('Model', ['gpt-4o', 'claude-3.5', 'llama-3.1']);
        refs.temperature = s.slider('Temperature', {
          min: 0,
          max: 2,
          step: 0.1,
          default: 0.7,
        });
        const verbose = s.toggle('Verbose logging', { default: false });
        const notes = s.textInput('Notes', { default: '', placeholder: 'Optional…' });
        const batch = s.numberInput('Batch size', { min: 1, max: 128, default: 8 });

        s.button('Sync summary metrics', () => {
          refs.verbose = verbose.value;
          refs.notes = notes.value;
          refs.batchSize = batch.value;
          syncSummaryMetrics();
          setStatus(
            `Summary synced · model=${refs.model?.value} temp=${refs.temperature?.value.toFixed(1)} batch=${refs.batchSize}`,
          );
        });

        s.divider({ label: 'Actions' });
        s.button('Append table row', () => {
          const t = refs.demoTable;
          if (!t) {
            return;
          }
          t.append({
            name: `row-${t.rowCount + 1}`,
            status: 'new',
            score: `${(0.5 + Math.random() * 0.49).toFixed(2)}`,
          });
          syncSummaryMetrics();
          setStatus(`Added table row ${t.rowCount}.`);
        });
        s.button('Stream sample', async () => {
          const out = refs.streamOut;
          if (!out) {
            return;
          }
          out.clear();
          const words = ['Token', 'stream', 'using', '.append()', 'and', '.done().'];
          for (const w of words) {
            out.append(`${w} `);
            await new Promise((r) => setTimeout(r, 120));
          }
          out.done();
          setStatus('Stream sample completed.');
        });
        s.button('Chat: user message', () => {
          const model = refs.model?.value ?? 'unknown';
          const temp = refs.temperature?.value ?? 0;
          refs.chat?.addMessage(
            'user',
            `Hello (${model}, T=${temp.toFixed(1)})`,
          );
          setStatus('Added a user message in Chat tab.');
        });
        s.button('Apply prompt to chat', () => {
          const model = refs.model?.value ?? 'gpt-4o';
          const text = refs.prompt?.interpolate({ model }) ?? '';
          if (text) {
            refs.chat?.addMessage('assistant', text);
            setStatus('Prompt interpolated and pushed to chat.');
          }
        });
        s.spacer('sm');
        s.loading('Sidebar loading indicator', { mode: 'inline', size: 'sm' });
      },
      main: (m: UIContext) => {
        m.markdown(
          '## Overview\nThis page demonstrates **layout**, **inputs**, **display**, and **AI-oriented** components with actions that visibly mutate the UI.',
        );

        m.grid(
          [
            (cell: UIContext) => {
              refs.metricModel = cell.metric('Model', refs.model?.value ?? 'gpt-4o');
            },
            (cell: UIContext) => {
              refs.metricTemp = cell.metric('Temperature', String(refs.temperature?.value ?? 0.7));
            },
            (cell: UIContext) => {
              refs.metricRows = cell.metric('Table rows', String(refs.demoTable?.rowCount ?? 0));
            },
            (cell: UIContext) => {
              refs.metricLastAction = cell.metric('Last action', '—');
            },
          ],
          { cols: 2, gap: 12 },
        );

        m.grid(
          [
            (cell: UIContext) => {
              cell.progress(65, { label: 'Determinate progress' });
            },
            (cell: UIContext) => {
              cell.progress(null, { label: 'Indeterminate progress' });
            },
          ],
          { cols: 2, gap: 12 },
        );

        m.spacer('md');

        m.card('Display primitives', (c: UIContext) => {
          c.markdown('Card body shows **code**, **JSON**, **image**, and **imageGrid**.');
          c.code('const model = ui.select("Model", ["gpt-4o", "claude-3.5"])', {
            lang: 'typescript',
          });
          c.json(
            {
              selectedModel: refs.model?.value ?? 'gpt-4o',
              temperature: refs.temperature?.value ?? 0.7,
              verbose: refs.verbose,
              batchSize: refs.batchSize,
            },
            { label: 'Live-ish config snapshot' },
          );
          c.image(DEMO_IMG, {
            alt: 'Sample image',
            caption: 'SVG data URL (lazy-loaded)',
          });
          c.imageGrid(
            [
              { src: DEMO_IMG, alt: 'A', caption: 'Tile A' },
              { src: DEMO_IMG, alt: 'B', caption: 'Tile B' },
            ],
            { cols: 2, gap: 8 },
          );
        });

        m.spacer('md');
        m.alert('Info alert with title.', { type: 'info', title: 'Feedback examples' });
        m.alert('Success variant.', { type: 'success', title: 'Saved' });
        m.divider();

        refs.demoTable = m.table([], {
          columns: ['name', 'status', 'score'],
          striped: true,
          maxHeight: 220,
        });
        refs.firstRow = refs.demoTable.append({
          name: 'alpha',
          status: 'ok',
          score: '0.91',
        });
        refs.demoTable.append({ name: 'beta', status: 'run', score: '—' });
        refs.demoTable.onRowClick((row: TableRow) => {
          setStatus(`Clicked row: ${String(row.name ?? '')}`);
        });

        m.button('Update first row (RowHandle)', () => {
          refs.firstRow?.update({ status: 'done', score: '0.99' });
          setStatus('First table row updated via RowHandle.');
        });

        m.text(
          'Click table rows to update header status. **Append table row** in sidebar adds rows.',
        );

        m.tabs(
          [
            {
              label: 'Stream',
              content: (t: UIContext) => {
                refs.streamOut = t.streamText({
                  label: 'streamText()',
                  format: 'plain',
                  cursor: true,
                });
                t.button('Clear stream', () => {
                  refs.streamOut?.clear();
                  setStatus('Stream output cleared.');
                });
              },
            },
            {
              label: 'Chat + prompt',
              content: (t: UIContext) => {
                refs.chat = t.chatUI({ maxHeight: 220 });
                refs.chat.addMessage(
                  'assistant',
                  'Use the sidebar to append user messages.',
                );
                refs.prompt = t.promptEditor({
                  label: 'Prompt ({{model}})',
                  default: 'Summarize for {{model}}.',
                  variables: ['model'],
                });
                t.button('Preview interpolated prompt', () => {
                  const model = refs.model?.value ?? 'gpt-4o';
                  const text = refs.prompt?.interpolate({ model }) ?? '';
                  setStatus(`Prompt preview: ${text.slice(0, 60)}`);
                });
              },
            },
            {
              label: 'Notes',
              content: (t: UIContext) => {
                t.markdown(
                  '- Use **Sync summary metrics** after editing controls.\n- Use **?debug=1** and open DevTools Console to inspect ws messages.\n- Tabs switch client-side; data changes still come from server FRAGMENT/STREAM_CHUNK.',
                );
              },
            },
          ],
          { defaultTab: 'Stream' },
        );

        m.spacer('lg');
        m.markdown(
          'See also `examples/experiment-monitor` and `examples/image-viewer` for larger compositions.',
        );
      },
      footer: (f: UIContext) => {
        f.text('Footer · `fileUpload` (POST /upload)');
        f.fileUpload('Upload', { accept: '.txt,.json', maxSize: 2 * 1024 * 1024 });
      },
    });
    syncSummaryMetrics();
  },
  { server: { port: 3500 } },
);
