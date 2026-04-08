/**
 * From this folder: `npm install` then `npm run dev`.
 * Open the printed URL — a walkthrough of Phase 1 + Phase 2 components.
 */
import type {
  ChatHandle,
  PromptEditorHandle,
  RowHandle,
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
  demoTable: TableHandle | null;
  firstRow: RowHandle | null;
  streamOut: StreamHandle | null;
  chat: ChatHandle | null;
  prompt: PromptEditorHandle | null;
  pingLabel: TextHandle | null;
} = {
  demoTable: null,
  firstRow: null,
  streamOut: null,
  chat: null,
  prompt: null,
  pingLabel: null,
};

function fragmentTimestampLabel(): string {
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

await app(
  'Lastriko component gallery',
  (ui: UIContext) => {
    ui.shell({
      header: (h: UIContext) => {
        h.text('Component gallery — foundation + MVP (Phase 2)');
        h.button('Toggle theme', () => {
          h.setTheme(h.theme === 'dark' ? 'light' : 'dark');
        });
        h.button('Toast', () => {
          h.toast('Short-lived toast', { type: 'info', duration: 2500 });
        });
        refs.pingLabel = h.text(
          'Phase 1: each Ping sends a FRAGMENT with a fresh timestamp.',
        );
        h.button('Ping', () => {
          refs.pingLabel?.update(
            `FRAGMENT at ${fragmentTimestampLabel()} — server-pushed HTML swap.`,
          );
        });
      },
      sidebar: (s: UIContext) => {
        s.markdown('**Sidebar**\nInputs and controls; actions below hit **main**.');
        const model = s.select('Model', ['gpt-4o', 'claude-3.5', 'llama-3.1']);
        const temp = s.slider('Temperature', {
          min: 0,
          max: 2,
          step: 0.1,
          default: 0.7,
        });
        s.toggle('Verbose logging', { default: false });
        s.textInput('Notes', { default: '', placeholder: 'Optional…' });
        s.numberInput('Batch size', { min: 1, max: 128, default: 8 });
        s.divider({ label: 'Actions' });
        s.button('Append table row', () => {
          const t = refs.demoTable;
          if (!t)
            return;
          t.append({
            name: `row-${t.rowCount + 1}`,
            status: 'new',
            score: '—',
          });
        });
        s.button('Stream sample', async () => {
          const out = refs.streamOut;
          if (!out)
            return;
          out.clear();
          const words = ['Token', 'stream', 'via', 'append()', '…'];
          for (const w of words) {
            out.append(`${w} `);
            await new Promise((r) => setTimeout(r, 120));
          }
          out.done();
        });
        s.button('Chat: user message', () => {
          refs.chat?.addMessage(
            'user',
            `Hello (${model.value}, T=${temp.value})`,
          );
        });
        s.spacer('sm');
        s.loading('Inline spinner', { mode: 'inline', size: 'sm' });
      },
      main: (m: UIContext) => {
        m.markdown(
          '## Display & layout\n**Markdown** in the main column. Below: **grid**, **card**, **metrics**, **progress**, **table**, **tabs**.',
        );

        m.grid(
          [
            (cell: UIContext) => {
              cell.metric('Temperature', '0.7', { unit: ' (static demo)' });
            },
            (cell: UIContext) => {
              cell.metric('Latency', '42', {
                unit: 'ms',
                delta: '-8%',
                deltaLabel: 'vs p50',
              });
            },
            (cell: UIContext) => {
              cell.progress(65, { label: 'Determinate' });
            },
            (cell: UIContext) => {
              cell.progress(null, { label: 'Indeterminate' });
            },
          ],
          { cols: 2, gap: 12 },
        );

        m.spacer('md');

        m.card('Card', (c: UIContext) => {
          c.text('Card body: **code**, **JSON**, **image**, **imageGrid**.');
          c.code('const x = await ui.select("Model", ["a", "b"])', {
            lang: 'typescript',
          });
          c.json({ demo: true, nested: { value: 1 } }, { label: 'Sample JSON' });
          c.image(DEMO_IMG, {
            alt: 'Sample',
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
        m.alert('Info alert with title.', { type: 'info', title: 'Feedback' });
        m.alert('Success variant.', { type: 'success' });
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
          m.toast(`Row: ${String(row.name ?? '')}`, { type: 'info' });
        });

        m.button('Update first row (RowHandle)', () => {
          refs.firstRow?.update({ status: 'done', score: '0.99' });
        });

        m.text(
          'Click a table row for a toast. **Append** adds rows from the sidebar.',
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
                t.button('Clear stream', () => refs.streamOut?.clear());
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
                t.button('Toast interpolated prompt', () => {
                  const text = refs.prompt?.interpolate({ model: 'gpt-4o' }) ?? '';
                  t.toast(text.slice(0, 80), { type: 'info', duration: 4000 });
                });
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
  },
  { server: { port: 3500 } },
);
