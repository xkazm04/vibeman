---
phase: 5
slug: triage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/api/conductor/triage-checkpoint.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/api/conductor/triage-checkpoint.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | TRIA-01 | unit | `npx vitest run tests/api/conductor/triage-checkpoint.test.ts -t "pauses at triage"` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | TRIA-02 | unit | `npx vitest run tests/api/conductor/triage-checkpoint.test.ts -t "approve reject"` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | TRIA-03 | unit | `npx vitest run tests/api/conductor/triage-checkpoint.test.ts -t "skipTriage"` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | TRIA-04 | unit | `npx vitest run tests/api/conductor/triage-checkpoint.test.ts -t "timeout"` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | BRAIN-03 | unit | `npx vitest run tests/api/conductor/triage-checkpoint.test.ts -t "brain conflict"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/api/conductor/triage-checkpoint.test.ts` — stubs for TRIA-01 through TRIA-04 and BRAIN-03
- [ ] Test fixtures for mock ideas with scores and Brain context

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UI renders triage checkpoint with items and Brain flags | TRIA-01 | Visual rendering | Open conductor UI, trigger a run, verify triage checkpoint appears with items |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
