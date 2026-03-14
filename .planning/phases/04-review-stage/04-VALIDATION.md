---
phase: 4
slug: review-stage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/api/conductor/review.test.ts` |
| **Full suite command** | `npx vitest run tests/api/conductor/` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/api/conductor/review.test.ts`
- **After every plan wave:** Run `npx vitest run tests/api/conductor/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | VALD-02 | unit | `npx vitest run tests/api/conductor/review.test.ts -t "review evaluates"` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | VALD-03 | unit | `npx vitest run tests/api/conductor/review.test.ts -t "per-file"` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | REPT-01 | unit | `npx vitest run tests/api/conductor/review.test.ts -t "report"` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | REPT-02 | unit | `npx vitest run tests/api/conductor/review.test.ts -t "auto-commit"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/api/conductor/review.test.ts` — stubs for VALD-02, VALD-03, REPT-01, REPT-02
- [ ] Test DB schema needs `execution_report`, `review_results` columns added
- [ ] Mock for LLM review call (diff review uses LLM; must mock response in tests)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auto-commit creates correct git commit | REPT-02 | Requires real git repo state | Run pipeline with autoCommit enabled on a test repo, verify commit message and staged files |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
