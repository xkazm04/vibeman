# Bug-Hunter + Test-Mastery Scan — Vibeman, 2026-06-19

> Combined-lens audit (🐛 Bug Hunter + 🧪 Test Mastery) of all 19 contexts.
> 19 parallel subagent runs, batched in waves of 8 / 8 / 3. Each context returned its
> 5 highest-value findings ranked across both lenses. Read-only scan.

---

## Totals

| | Critical | High | Medium | Low | **Total** |
|---|---:|---:|---:|---:|---:|
| Across 19 contexts | 17 | 48 | 28 | 2 | **95** |
| Share | 18% | 51% | 29% | 2% | 100% |

Counts verified two ways: sum of `> Total:` headers = 95; count of `- **Severity**:` bullets = 95. ✓

Baselines (regression ceiling): **tsc source = 0 errors** (123 reported errors are all stale `.next/dev/types/` generated artifacts), **vitest = 547/550 pass** (3 failures are one stale test — `signal-types.test.ts` — see Brain #1).

---

## Per-context breakdown

(Sorted by criticals desc, then highs)

| # | Context | C | H | M | L | Total | Report |
|---|---|---:|---:|---:|---:|---:|---|
| 1 | Workspace & Project Management | 2 | 2 | 1 | 0 | 5 | `workspace-project-management.md` |
| 2 | Remote Device Control | 2 | 2 | 1 | 0 | 5 | `remote-device-control.md` |
| 3 | Database & Schema | 2 | 2 | 1 | 0 | 5 | `database-schema.md` |
| 4 | Context Management | 1 | 3 | 1 | 0 | 5 | `context-management.md` |
| 5 | Ideas System | 1 | 3 | 1 | 0 | 5 | `ideas-system.md` |
| 6 | Manager & Directions | 1 | 3 | 1 | 0 | 5 | `manager-directions.md` |
| 7 | Reflector & Executive Analysis | 1 | 3 | 1 | 0 | 5 | `reflector-executive-analysis.md` |
| 8 | Docs & Architecture Explorer | 1 | 3 | 1 | 0 | 5 | `docs-architecture-explorer.md` |
| 9 | TaskRunner & Claude Code | 1 | 3 | 1 | 0 | 5 | `taskrunner-claude-code.md` |
| 10 | Testing & Scenarios | 1 | 3 | 1 | 0 | 5 | `testing-scenarios.md` |
| 11 | Scan Queue & Build Fixer | 1 | 2 | 2 | 0 | 5 | `scan-queue-build-fixer.md` |
| 12 | Debt Prediction & Refactoring | 1 | 2 | 2 | 0 | 5 | `debt-prediction-refactoring.md` |
| 13 | Dependencies & Security | 1 | 2 | 2 | 0 | 5 | `dependencies-security.md` |
| 14 | Integrations & Template Discovery | 1 | 2 | 2 | 0 | 5 | `integrations-template-discovery.md` |
| 15 | Blueprint & Onboarding | 0 | 3 | 2 | 0 | 5 | `blueprint-onboarding.md` |
| 16 | Brain & Behavioral Signals | 0 | 3 | 2 | 0 | 5 | `brain-behavioral-signals.md` |
| 17 | Goals & Daily Standup | 0 | 3 | 2 | 0 | 5 | `goals-daily-standup.md` |
| 18 | Annette AI Assistant | 0 | 2 | 2 | 1 | 5 | `annette-ai-assistant.md` |
| 19 | Social Feedback System | 0 | 2 | 2 | 1 | 5 | `social-feedback-system.md` |

---

## All 17 critical findings — grouped by theme

### A. Trust-boundary / security (6)
1. **Workspace #1 — `disk/file` accepts ANY absolute path.** `POST /api/disk/file {action:read|write, filePath:"C:\\Users\\me\\.ssh\\id_rsa"}` succeeds; `validateFilePath` only blocks `..`/`~`/null, no base confinement. The correct helper `validatePathWithinBase` exists but is never wired in. Any localhost client = whole-machine read+write. `disk/file/route.ts:34,72`
2. **Workspace #2 — `disk/search` directories listing bypasses the deny-list.** `handleDirectories` uses `validatePathTraversal` (only `..`/`~`/null) and skips the purpose-built `validateSafeBasePath`/`FORBIDDEN_SYSTEM_PREFIXES` → enumerate `C:\Windows\System32`, `/etc`, `/root`. `disk/search/route.ts:111`
3. **Integrations #1 — `template-discovery/generate` writes attacker-controlled files anywhere.** Only an existence-`stat` on `targetProjectPath`; no registered-project allowlist. Writes caller `content` into `{path}/.claude/commands/*.md` with `overwrite:true` → clobbers requirement files that drive autonomous CLI runs. `template-discovery/generate/route.ts:37-74`
4. **Remote #1 — device register/heartbeat/delete are unauthenticated.** Command/mesh paths require `api_key` via `requireClient`, but lifecycle routes verify nothing → spoof/overwrite/evict any fleet device that command-routing depends on. `remote/devices/route.ts:47`, `heartbeat/route.ts:10`, `devices/[id]/route.ts:118`
5. **Dependencies #1 — every quality gate (incl. `security_scan`) ignores `projectId`/`cwd`.** `npm audit`/typecheck/build run in vibeman's own CWD, so per-project PASS/FAIL describes vibeman, not the target. `lifecycle/quality-gate/route.ts:34,240`
6. **Remote #2 — `deviceRegistry` singleton keyed on one mutable `this.deviceId`.** Heartbeat carries no id and always mutates the last-registered device → cross-device heartbeat corruption. `lib/remote/deviceRegistry.ts:20,100-113`

### B. Missing CAS / idempotency / double-completion (5)
7. **Ideas #1 — `acceptIdea` has no server-side CAS/idempotency.** Only dedup is a per-tab client map; state machine treats `accepted→accepted` as no-op, so concurrent/retried accepts both write the requirement file and double-fire brain signals, all `success:true`. `lib/ideas/ideaAcceptanceWorkflow.ts:107-194`
8. **Reflector #1 — architecture `completeAnalysis` has no `status==='running'` re-check.** Duplicate completion callback re-runs `upsertMany` → corrupts cross-project relationships feeding the executive report. `lib/architecture/analysisAgent.ts:158-216`
9. **Scan Queue #1 — scan→queue link uses global `getLatestScanId(project,type)`, not this run's scan id.** Any concurrent same-type scan → item links + auto-merges the wrong scan's ideas. `lib/scanQueueWorker.ts:408`
10. **Manager #1 — remote "accept direction" violates the state machine.** Writes the requirement file, then `acceptDirection` does `pending→accepted`, which `DIRECTION_TRANSITIONS.pending` disallows → throws after the file exists → orphaned file + stuck-pending direction. (Desktop path claims pending→processing first; remote never adopted it.) `lib/remote/commandHandlers.ts:722-751`

### C. Success-theater / silent-failure (3)
11. **Database #1 — `safeMigration` swallows DDL errors inside `runOnce` → migration recorded `applied` forever.** A throwing `ALTER/CREATE` is caught-and-logged; `runOnce` commits `status='applied'` and never retries → permanent silent schema corruption across ~108 migration bodies. `db/migrations/migration.utils.ts:130-140 × :265-290`
12. **TaskRunner #1 — missing Claude CLI silently resolves `success:true` "simulation mode".** Queue marks the task completed, fires success events, resolves collective memory as success, runs `performTaskCleanup` (deletes requirement file, flips idea status) — for a run that wrote zero code. `Claude/sub_ClaudeCodeManager/executionManager.ts:331-350`
13. **Testing #1 — "visual regression" never compares.** Executor captures a PNG, overwrites the prior file, returns `success:true` on page load. No baseline, no diff, no threshold → a regression test that cannot detect a regression. `tester/lib/screenshotExecutor.ts:144-171`

### D. Data-loss / wrong-data (3)
14. **Database #2 — Supabase sync does clear-then-insert with no transaction.** A mid-stream batch failure leaves the remote mirror truncated/partial with no rollback. `lib/supabase/sync.ts:196-203`
15. **Debt #3 — unused-component detector flags live components as "unused".** Default-export name guessed from filename + regex search misses aliased default imports (`import Box from './Card'`) → false "unused" → data loss on auto-remove. `lib/scan/unusedCodeDetector.ts:349-388`
16. **Context Mgmt #1 — deferred cleanup wipes the entire context map on CLI-reported counts.** The bulk-delete of `previousDataIds` is gated on `contextsCreated`/`groupsCreated` parsed from CLI stdout, not verified DB rows → a hallucinated/partial-write count deletes every context/group/relationship with no undo. `Context/hooks/useContextGenerationStream.ts:113-130`

### E. Filtering correctness (1)
17. **Docs #1 — `GET /api/xray` computes a context-filtered query then discards it.** Returns unfiltered `getRecentEventsFromDb`; `?contextId=`/`?contextGroupId=` silently ignored, stats computed over the whole table → every per-context X-Ray view shows global traffic. `api/xray/route.ts:23-31`

---

## Triage themes (the 95, clustered)

| Theme | ~Count | Why it's a wave, not isolated fixes |
|---|---:|---|
| **A. Security / trust-boundary** | 7 | Arbitrary disk R/W, arbitrary file-write, unauthenticated device fleet, wrong audit target. Shared fix vocabulary (wire existing `validatePathWithinBase`/`validateSafeBasePath`/`requireClient`/project-allowlist). Highest value, low ambiguity. |
| **B. Missing CAS / idempotency** | 13 | Double-accept, double-completion, non-atomic upsert/bulk, TOCTOU. Shared pattern: status-CAS on write + in-flight guard. |
| **C. Success-theater / silent-failure** | 10 | Code reports success while doing nothing / wrong thing (sim mode, no-diff screenshots, fail-open gates, ignored `response.ok`, stub packages). |
| **D. Data-loss / destructive non-atomic writes** | 4 | Map-wipe on bad counts, Supabase truncate, false-unused delete, dropped drag moves. |
| **E. Wrong-data / scoring / time** | 6 | xray filter drop, wrong target_layer, effectiveness ÷near-zero, standup ISO-vs-date key + TZ bucketing. |
| **F. Lifecycle / zombies / leaks** | 7 | Zombie CLI on Windows spawn, no reaper, registry not reconciled on abort, retry storms, orphaned child on timeout, FK pragma warn-only. |
| **G. Test coverage (test-mastery)** | ~16 | "Zero tests" on the highest-blast paths: migration state machine, `buildUpdateStatement` injection whitelist, idea accept/reject, remote auth gate, security decision, goal/standup core, impact analyzer. |
| **H. Cleanup / context-map integrity** | ~9 | Phantom contexts + orphaned e2e/tests + orphaned DB tables + stale nav. Includes the one fix that restores the green test baseline (Brain #1). |

---

## ⚠️ Cross-cutting finding: context-map drift

The scan surfaced **severe context-map drift** — many manifest file paths no longer exist (features removed in the 2026-06-13 headless slim-down and later cleanups), so the map misrepresents the codebase to every future scan/tool.

- **100% phantom (entire manifest deleted):** Annette AI Assistant (26 files), Social Feedback System (17, commit `3f81b889`), Dependencies & Security (17, commit `9653fcbc`).
- **Heavily drifted (>50% gone):** Blueprint & Onboarding (~13/21, `BlueprintModal` is a `return null` stub), Debt Prediction (12/18, feature deleted, DB tables orphaned), Integrations (~12/22), Testing & Scenarios (~11/18).
- **Moderately drifted:** Brain (UI tree + store gone; backend moved to `src/lib/brain/*`), Goals (~8 stale; real generator at `src/lib/standup/`), Workspace (`disk/glob` + `disk/list-directories` consolidated into `disk/file`/`disk/search`).
- **Lightly drifted:** Reflector (2-3 wrong repo names), Remote (1 stale + 2 missing routes).

**Recommendation:** after the fix waves, run `refresh_context` on the moderately-drifted contexts and **delete the 3 phantom contexts** from `context_map.json` + remove their orphaned `e2e/` suites and orphaned DB tables. (Subagents re-anchored to the live successor code, so the findings remain valid — they just don't match the stale manifest paths.)

---

## Suggested next-phase split (fix waves)

| Wave | Theme | Findings | Notes |
|---|---|---:|---|
| **W1** | Security / trust-boundary (A) | 6–7 | All-critical, clear fixes, existing helpers to wire in. Start here. |
| **W2** | CAS / idempotency (B) | 6–7 | Status-CAS + in-flight guards on accept/complete/upsert paths. |
| **W3** | Success-theater + data-loss (C+D top) | 6–7 | Migration fail-record, sim-mode, screenshot-diff, map-wipe verify, Supabase txn. |
| **W4** | Wrong-data / time / scoring (E) | 6 | xray filter, target_layer, standup key, effectiveness floor. |
| **W5** | Lifecycle / zombies / leaks (F) | 6–7 | Spawn cleanup, reapers, abort reconcile, retry backoff. |
| **W6** | Cleanup + green-baseline + test seeds (G+H) | varies | Delete phantom contexts/e2e, fix stale test (restores 550/550), seed highest-blast unit tests. |

Each wave ≈ 5–7 atomic commits, verified against the tsc-0 / vitest-547 baseline.

---

## How this scan was run

- **Scanners:** `bug_hunter` (🐛) + `test_mastery` (🧪) prompts from `src/lib/prompts/registry/agents/`, applied as combined lenses per context.
- **Scope:** all 19 contexts, full-stack (TS/TSX). 374 manifest paths; subagents followed imports to live code where manifests were stale.
- **Method:** 19 `general-purpose` subagents, waves of 8/8/3; each wrote one report + a terse reply. Orchestrator read only the replies during scanning.
- **Cap:** 5 highest-value findings per context (combined ranking).
- **Verification:** Total-header sum (95) == Severity-bullet count (95).
- **Date:** 2026-06-19. **Project:** vibeman (`c32769af-72ed-4764-bd27-550d46f14bc5`).
</content>
</invoke>
