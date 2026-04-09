# Phase 4.5 Benchmark Artifacts

This document records reproducible benchmark outputs required by Phase 4.5.

## How to run

From repo root:

```bash
npm run benchmark:phase45
```

Raw JSON artifacts are written to:

- `artifacts/benchmarks/table-10k.json`
- `artifacts/benchmarks/slider-batching.json`
- `artifacts/benchmarks/lazy-image-first-paint.json`

Generated markdown summary:

- `docs/benchmarks/PHASE-4-5-RESULTS.md`

## Notes

- Benchmarks run in Playwright Chromium on the CI host.
- Values are environment-sensitive and should be compared against previous runs in the same environment class.
- Pass/fail checks are encoded in `tests/perf/phase45.benchmark.spec.ts` and enforced in CI.
