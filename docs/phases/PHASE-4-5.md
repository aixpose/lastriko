# Phase 4.5 — Quality & Compliance Hardening

> **Back to:** [MANIFEST.md](../../MANIFEST.md)
> **Status:** In Progress
> **Target version:** `0.3.5`

---

## Goal

Ship formal, repeatable quality evidence for accessibility, E2E behavior, and performance targets that were intentionally deferred after Phase 3 feature delivery.

This phase is verification-focused: no new component surface, no plugin scope, no export scope.

---

## Exit Criteria

1. Automated accessibility gate is added and enforced in CI (aXe or equivalent) with **zero critical/serious violations**.
2. Deferred Phase 3 Playwright E2E scenarios are implemented and running in CI:
   - `beforeAfter` touch/mobile drag flow
   - hot reload state restoration (inputs/scroll/active tab)
   - error overlay rendering/recovery flow
3. Performance evidence artifacts are generated and documented for:
   - 10K-row table initial viewport render target
   - rapid slider event batching target
   - lazy image loading first-paint target
4. Results are documented in phase docs and linked from roadmap/changelog.

## Implementation Notes (current)

- Playwright config: `playwright.config.ts`
- E2E specs: `tests/e2e/*.spec.ts`
- Accessibility specs: `tests/a11y/*.a11y.spec.ts` (Playwright + aXe)
- Benchmark specs: `tests/perf/*.spec.ts`
- Benchmark artifacts:
  - machine-readable JSON in `artifacts/phase4-5/benchmarks/`
  - markdown summary in [docs/benchmarks/PHASE-4-5.md](../benchmarks/PHASE-4-5.md)
- CI uploads screenshot/trace/video artifacts for visibility on failures.

---

## Scope

### 1) Accessibility compliance gate

- Add CI job for a11y checks using Playwright + aXe (or equivalent).
- Cover representative pages that exercise all shipped components through Phase 4.
- Fail CI on critical/serious violations.

### 2) End-to-end verification

- Add Playwright specs for deferred interactive behaviors.
- Make tests deterministic and suitable for CI (retries/timeouts tuned, flaky selectors avoided).

### 3) Performance verification artifacts

- Add reproducible benchmark scripts.
- Record machine/runtime assumptions and output format.
- Publish benchmark results in docs.

---

## Non-Goals

- New UI components
- Plugin features from Phase 4
- Export/distribution features from Phase 5

---

*[← Phase 4](PHASE-4.md) — Phase 4.5 of 7 — [Next: Phase 5 →](PHASE-5.md)*
