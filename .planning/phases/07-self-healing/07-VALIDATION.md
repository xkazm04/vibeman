---
phase: 7
slug: self-healing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/api/conductor/self-healing.test.ts` |
| **Full suite command** | `npx vitest run tests/api/conductor/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/api/conductor/self-healing.test.ts`
- **After every plan wave:** Run `npx vitest run tests/api/conductor/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | HEAL-01 | unit | `npx vitest run tests/api/conductor/self-healing.test.ts -t "classif"` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | HEAL-02 | unit | `npx vitest run tests/api/conductor/self-healing.test.ts -t "healing"` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | HEAL-02, HEAL-03 | integration | `npx vitest run tests/api/conductor/self-healing.test.ts -t "retry"` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 3 | HEAL-03, HEAL-04 | integration | `npx vitest run tests/api/conductor/self-healing.test.ts -t "prun"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/api/conductor/self-healing.test.ts` — stubs for HEAL-01 through HEAL-04
- [ ] Test helpers for mock error scenarios (syntax, dependency, logic, timeout)

*Existing conductor test infrastructure (`tests/api/conductor/pipeline.test.ts`) provides base patterns.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Healing history UI shows patch expiry and success rate | HEAL-04 | UI rendering | Open healing history panel, verify columns visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
