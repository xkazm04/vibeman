---
phase: 02
slug: spec-writer
status: draft
nyquist_compliant: false
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
| **Quick run command** | `npx vitest run tests/conductor/spec-writer/ --reporter=verbose` |
| **Full suite command** | `npx vitest run tests/conductor/ --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/conductor/spec-writer/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run tests/conductor/ --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SPEC-01 | unit | `npx vitest run tests/conductor/spec-writer/spec-generation.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | SPEC-02 | unit | `npx vitest run tests/conductor/spec-writer/file-claims.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | SPEC-03 | unit | `npx vitest run tests/conductor/spec-writer/brain-injection.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | SPEC-01 | integration | `npx vitest run tests/conductor/spec-writer/spec-pipeline.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/conductor/spec-writer/spec-generation.test.ts` — stubs for SPEC-01 (spec structure, sections, acceptance criteria format)
- [ ] `tests/conductor/spec-writer/file-claims.test.ts` — stubs for SPEC-02 (affected files categorization, validation, ts-morph discovery)
- [ ] `tests/conductor/spec-writer/brain-injection.test.ts` — stubs for SPEC-03 (Brain convention injection, confidence labeling, fallback)
- [ ] `tests/conductor/spec-writer/spec-pipeline.test.ts` — stubs for end-to-end spec generation pipeline

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Spec markdown readability | SPEC-01 | Subjective formatting quality | Review generated spec for human-readable structure |
| Brain convention relevance | SPEC-03 | LLM output quality | Verify injected conventions match project patterns |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
