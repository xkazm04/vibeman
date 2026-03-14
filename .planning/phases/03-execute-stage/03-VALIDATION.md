---
phase: 3
slug: execute-stage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/conductor/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/conductor/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | EXEC-01 | unit | `npx vitest run tests/conductor/domain-scheduler.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | EXEC-02 | unit | `npx vitest run tests/conductor/domain-scheduler.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | EXEC-03 | unit | `npx vitest run tests/conductor/execute-stage.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | EXEC-04 | unit | `npx vitest run tests/conductor/checkpoints.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | VALD-01 | unit | `npx vitest run tests/conductor/build-validator.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/conductor/domain-scheduler.test.ts` — stubs for EXEC-01, EXEC-02 (overlap detection, parallel dispatch, serial queuing)
- [ ] `tests/conductor/execute-stage.test.ts` — stubs for EXEC-03 (spec status updates in DB during execution)
- [ ] `tests/conductor/checkpoints.test.ts` — stubs for EXEC-04 (checkpoint toggle, pause/resume behavior)
- [ ] `tests/conductor/build-validator.test.ts` — stubs for VALD-01 (tsc --noEmit result capture)
- [ ] `tests/conductor/file-verifier.test.ts` — stubs for EXEC-01 success/failure detection logic

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UI shows per-task execution status | EXEC-03 | Visual rendering verification | Open conductor UI, trigger a run, verify status badges update in real-time |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
