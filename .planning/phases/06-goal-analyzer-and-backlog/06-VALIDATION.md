---
phase: 06
slug: goal-analyzer-and-backlog
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + better-sqlite3 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/api/conductor/goal-analyzer.test.ts` |
| **Full suite command** | `npx vitest run tests/api/conductor/` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/api/conductor/goal-analyzer.test.ts`
- **After every plan wave:** Run `npx vitest run tests/api/conductor/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | GOAL-02, GOAL-03 | unit | `npx vitest run tests/api/conductor/goal-analyzer.test.ts -t "gap report"` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | BRAIN-01, BRAIN-02 | unit | `npx vitest run tests/api/conductor/goal-analyzer.test.ts -t "brain"` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | BACK-01, BACK-02, BACK-03 | unit | `npx vitest run tests/api/conductor/goal-analyzer.test.ts -t "backlog"` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | BACK-01 | integration | `npx vitest run tests/api/conductor/goal-analyzer.test.ts -t "orchestrator"` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 3 | ALL | integration | `npx vitest run tests/api/conductor/goal-analyzer.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/api/conductor/goal-analyzer.test.ts` — stubs for GOAL-02, GOAL-03, BACK-01, BACK-02, BACK-03, BRAIN-01, BRAIN-02
- [ ] Test DB setup extending existing `createConductorTables` with gap_report column
- [ ] Mock for `/api/ai/chat` responses (structured JSON matching GoalAnalyzerOutput)

*Existing infrastructure covers test framework and DB patterns.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LLM produces quality gap analysis | GOAL-02 | LLM output quality varies | Run with real goal, inspect gap report for relevance |
| Creative suggestions are non-trivial | BACK-02 | Subjective quality check | Review scan type suggestions in backlog for usefulness |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
