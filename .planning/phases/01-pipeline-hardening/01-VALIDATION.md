---
phase: 1
slug: pipeline-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose tests/lib/template-discovery/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose tests/lib/template-discovery/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | PIPE-01 | unit | `npx vitest run tests/lib/template-discovery/parser.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | PIPE-03 | unit | `npx vitest run tests/lib/template-discovery/scanner.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | PIPE-04 | unit | `npx vitest run tests/api/template-discovery/route.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | PIPE-02 | manual | N/A — React component test | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/template-discovery/parser.test.ts` — stubs for PIPE-01 (ts-morph reuse)
- [ ] `tests/lib/template-discovery/scanner.test.ts` — stubs for PIPE-03 (path normalization)
- [ ] `tests/api/template-discovery/route.test.ts` — stubs for PIPE-04 (stale cleanup safety)

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No auto-scan on project switch | PIPE-02 | React useEffect behavior requires browser/component mount | 1. Open Integrations module 2. Switch active project 3. Verify no scan API calls fire (check Network tab) 4. Click Scan button manually to verify it works |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
