const { mkdirSync, readdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const artifactsDir = join(process.cwd(), 'artifacts', 'benchmarks');
const outputPath = join(process.cwd(), 'docs', 'benchmarks', 'PHASE-4-5-RESULTS.md');

const files = readdirSync(artifactsDir).filter((file) => file.endsWith('.json')).sort();
const checks = files.map((file) => {
  const payload = JSON.parse(readFileSync(join(artifactsDir, file), 'utf8'));
  return {
    scenario: payload.scenario ?? file,
    metric: payload.metric ?? 'unknown',
    value: payload.value ?? 'n/a',
    target: payload.target ?? 'n/a',
    pass: Boolean(payload.pass),
    environment: payload.environment ?? {},
  };
});

const firstEnv = checks[0]?.environment ?? {};

const lines = [];
lines.push('# Phase 4.5 Benchmark Results');
lines.push('');
lines.push(`Generated at: ${new Date().toISOString()}`);
lines.push('');
lines.push('## Environment');
lines.push('');
lines.push(`- Browser: ${firstEnv.browser ?? 'unknown'}`);
lines.push(`- Platform: ${firstEnv.os ?? process.platform}`);
lines.push(`- Arch: ${firstEnv.arch ?? process.arch}`);
lines.push(`- Node: ${firstEnv.node ?? process.version}`);
lines.push('');
lines.push('## Measurements');
lines.push('');
lines.push('| Scenario | Metric | Value | Target | Pass |');
lines.push('|---|---|---:|---|---|');

for (const check of checks) {
  lines.push(
    `| ${check.scenario} | ${check.metric} | ${String(check.value)} | ${check.target} | ${check.pass ? 'yes' : 'no'} |`,
  );
}

lines.push('');
lines.push('## Notes');
lines.push('');
lines.push('- Values are environment-sensitive and should be compared against previous runs in the same CI class.');
lines.push('- Pass/fail is enforced by `tests/perf/phase45.benchmark.spec.ts` in CI.');
lines.push('');

mkdirSync(join(process.cwd(), 'docs', 'benchmarks'), { recursive: true });
writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
console.info(`[phase4.5] wrote ${outputPath}`);
