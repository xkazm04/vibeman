---
phase: 01
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FOUND-01 | integration | `npx vitest run tests/conductor/state-persistence.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | FOUND-02 | unit | `npx vitest run tests/conductor/stage-contracts.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | FOUND-03 | integration | `npx vitest run tests/conductor/run-history.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | GOAL-01 | integration | `npx vitest run tests/conductor/goal-input.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/conductor/state-persistence.test.ts` — stubs for FOUND-01
- [ ] `tests/conductor/stage-contracts.test.ts` — stubs for FOUND-02
- [ ] `tests/conductor/run-history.test.ts` — stubs for FOUND-03
- [ ] `tests/conductor/goal-input.test.ts` — stubs for GOAL-01

*Existing vitest infrastructure covers framework needs. Only test stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pipeline survives HMR reload | FOUND-01 | Requires dev server restart | 1. Start dev server 2. Trigger pipeline run 3. Save a file to trigger HMR 4. Verify run status in UI |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
