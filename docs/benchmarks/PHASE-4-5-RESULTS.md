# Phase 4.5 Benchmark Results

Generated at: 2026-04-09T16:13:25.354Z

## Environment

- Browser: chromium
- Platform: linux
- Arch: x64
- Node: v22.22.1

## Measurements

| Scenario | Metric | Value | Target | Pass |
|---|---|---:|---|---|
| lazy-image-first-paint | first_contentful_paint | 24 | <=2000ms | yes |
| slider-batching | batch_messages_observed | 1 | >0 BATCH messages during rapid slider updates | yes |
| table-10k-viewport | visible_rows_in_initial_viewport | 28 | >0 and <350 rows rendered in viewport | yes |

## Notes

- Values are environment-sensitive and should be compared against previous runs in the same CI class.
- Pass/fail is enforced by `tests/perf/phase45.benchmark.spec.ts` in CI.

