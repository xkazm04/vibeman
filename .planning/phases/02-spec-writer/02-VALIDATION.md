---
phase: 02
slug: spec-writer
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-14
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/conductor/spec-writer.test.ts --reporter=verbose` |
| **Full suite command** | `npx vitest run tests/conductor/ --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/conductor/spec-writer.test.ts --reporter=verbose`
- **After every plan wave:** Run `npx vitest run tests/conductor/ --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SPEC-01 | unit | `npx vitest run tests/conductor/spec-writer.test.ts -t "renderSpec"` | Wave 0 (stubs) | ⬜ pending |
| 02-01-02 | 01 | 1 | SPEC-02 | unit | `npx vitest run tests/conductor/spec-writer.test.ts -t "specRepository"` | Wave 0 (stubs) | ⬜ pending |
| 02-02-01 | 02 | 2 | SPEC-03 | unit | `npx vitest run tests/conductor/spec-writer.test.ts -t "Brain integration"` | Wave 0 (stubs) | ⬜ pending |
| 02-03-01 | 03 | 3 | SPEC-01 | integration | `npx vitest run tests/conductor/spec-writer.test.ts --reporter=verbose` | Wave 0 (stubs) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/conductor/spec-writer.test.ts` — created in Plan 01 Task 1 with `it.todo` stubs for all describe blocks:
  - `renderSpec` (SPEC-02: spec structure, sections, acceptance criteria format)
  - `generateSlug` (slug generation)
  - `deriveComplexity` (complexity mapping)
  - `specFileManager` (filename formatting)
  - `specRepository` (SPEC-01: CRUD persistence)
  - `Brain integration` (SPEC-03: convention injection, confidence labeling, fallback)

Plan 03 Task 1 converts `it.todo` stubs into real test implementations.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Spec markdown readability | SPEC-01 | Subjective formatting quality | Review generated spec for human-readable structure |
| Brain convention relevance | SPEC-03 | LLM output quality | Verify injected conventions match project patterns |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
