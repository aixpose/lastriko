import { app, type UIContext } from 'lastriko';

interface BenchRow {
  id: string;
  model: string;
  status: string;
  score: string;
}

function makeRows(count: number): BenchRow[] {
  const rows: BenchRow[] = [];
  for (let i = 0; i < count; i += 1) {
    rows.push({
      id: `row-${String(i + 1).padStart(5, '0')}`,
      model: i % 2 === 0 ? 'gpt-4o' : 'claude-3.5',
      status: i % 3 === 0 ? 'running' : 'queued',
      score: (0.7 + ((i % 30) / 100)).toFixed(2),
    });
  }
  return rows;
}

await app(
  'Lastriko bench: table-10k',
  (ui: UIContext) => {
    ui.shell({
      header: (h: UIContext) => {
        h.text('Benchmark: 10k-row table viewport render');
      },
      main: (m: UIContext) => {
        m.table(makeRows(10_000), {
          columns: ['id', 'model', 'status', 'score'],
          striped: true,
          maxHeight: 420,
          emptyMessage: 'No rows',
        });
      },
    });
  },
  { server: { port: 3500 } },
);
