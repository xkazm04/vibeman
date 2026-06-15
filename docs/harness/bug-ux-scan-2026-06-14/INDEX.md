# Bug-Hunter + UI-Perfectionist Scan — vibeman, 2026-06-14

> Combined bug-hunter (🐛) + ui-perfectionist (🎨) audit of the 10 "live" contexts that survived the
> `headless-slim` refactor (≥74% of files still on disk). 5 findings per context, 10 parallel subagent
> runs in 2 waves of 5. The other 9 contexts (45% of the DB context map) were skipped as gutted by the refactor.

---

## Totals

| | Critical | High | Medium | Low | **Total** |
|---|---:|---:|---:|---:|---:|
| Across 10 contexts | 9 | 24 | 13 | 4 | **50** |
| Share | 18% | 48% | 26% | 8% | 100% |

Lens split: **42 bug-hunter / 8 ui-perfectionist** (the surviving codebase is backend/orchestration-heavy).
Counts verified two ways: 10 × "Total: 5" headers = 50; severity bullets = 50. ✔

---

## Per-context breakdown

(Sorted by criticals desc, then total. Counts are bullet-derived; `ideas-system` header mislabeled one High as Medium — canonical below.)

| # | Context | C | H | M | L | Total | Report |
|---|---|---:|---:|---:|---:|---:|---|
| 1 | Remote Device Control | 3 | 2 | 0 | 0 | 5 | `remote-device-control.md` |
| 2 | Context Management | 1 | 2 | 1 | 1 | 5 | `context-management.md` |
| 3 | Database & Schema | 1 | 2 | 2 | 0 | 5 | `database-schema.md` |
| 4 | Docs & Architecture Explorer | 1 | 2 | 1 | 1 | 5 | `docs-architecture-explorer.md` |
| 5 | Reflector & Executive Analysis | 1 | 2 | 1 | 1 | 5 | `reflector-executive-analysis.md` |
| 6 | Scan Queue & Build Fixer | 1 | 3 | 1 | 0 | 5 | `scan-queue-build-fixer.md` |
| 7 | TaskRunner & Claude Code | 1 | 3 | 1 | 0 | 5 | `taskrunner-claude-code.md` |
| 8 | Manager & Directions | 0 | 3 | 2 | 0 | 5 | `manager-directions.md` |
| 9 | Workspace & Project Mgmt | 0 | 3 | 1 | 1 | 5 | `workspace-project-management.md` |
| 10 | Ideas System | 0 | 2 | 3 | 0 | 5 | `ideas-system.md` |

---

## All 9 critical findings — one-line summary

1. **Remote — unauthenticated command dispatch.** Mesh + Fleet POST endpoints queue device commands with ZERO auth (the file even documents it); any reachable caller commands the whole fleet. `mesh/commands/route.ts:101`, `fleet/route.ts:228`
2. **Remote — no device-ownership model.** Even authenticated clients can command/delete *any* device of *any* tenant. `commands/route.ts:130`, `devices/[id]/route.ts:115`
3. **Remote — PATCH targets the wrong device.** `PATCH /devices/[id]` ignores the URL id and mutates the local server's *own* device, then echoes the target's stale row as success. `devices/[id]/route.ts:87`
4. **Context — destructive data loss.** On any generation `result` event (even a cutoff that produced nothing), cleanup deletes the user's entire existing context map with no undo. `useContextGenerationStream.ts:102`
5. **Database — nested-transaction migration crash.** `runOnce` opens a txn; migration 067 opens its own `BEGIN TRANSACTION` inside it → SQLite throws exactly on the DBs that need the migration. `migration.utils.ts:256`
6. **Docs — X-Ray is success theater.** The X-Ray view is never wired to its store (`connect()`/`addEvent()`/`subscribe` have zero callers); the flagship feature renders permanently empty while looking live. `DocsAnalysisLayout.tsx:181`
7. **Reflector — client crash on analysis start.** `process.cwd()` is called inside a `'use client'` component, throwing in the browser and taking down the panel the moment an analysis runs. `ExecutiveSummary.tsx:610`
8. **Scan/Build — broken build reported green.** `scanBuildErrors` ignores the build exit code; a build that fails to run (cmd-not-found, crash, unparseable output) returns `success:true, totalErrors:0`, suppressing the very signal the tool exists for. `buildScanner.ts:435`
9. **TaskRunner — rate-limit retry storm.** Limit detection scans only stderr, but `--output-format stream-json` writes the limit event to stdout → misclassified as generic failure → immediate `setImmediate` re-queue instead of 60s backoff → quota-burning storm. `executionManager.ts:292`

---

## Findings by theme (triage clusters)

### A. Success theater / silent failure — a result reported as success that didn't happen (10)
- [C] Build green when build never ran — `buildScanner.ts:435` (scan-queue #1)
- [C] X-Ray disconnected from store, looks live — `DocsAnalysisLayout.tsx:181` (docs #1)
- [C] PATCH /devices echoes stale row as success — `devices/[id]/route.ts:87` (remote #3)
- [H] commit+push retry "nothing to commit" = false success → never pushed — `commit-and-push/route.ts:271` (workspace #1)
- [H] Context "refresh from DB" hits 404 route, silent no-op — `ContextOverviewInline.tsx:43` (context #2)
- [H] ProposalPanel always renders 3 hardcoded mock proposals — `ProposalPanel.tsx:19` (manager #2)
- [H] "Accept with Code" silently identical to plain Accept — `DirectionCarousel.tsx:334` (manager #1)
- [H] Empty-state "Generate Ideas" CTA targets non-existent testid (dead) — `BufferView.tsx:255` (ideas #2)
- [M] Convert/queue treat idempotent HTTP 409 as a hard error — `BufferView.tsx:167` (ideas #3)
- [M] File-watch notification FK violation silently swallowed — `fileWatcher.ts:169` (scan-queue #5)

### B. Concurrency / race / double-execution (7)
- [H] PATCH /scan-queue/[id] overwrites worker-owned status → double exec — `scan-queue/[id]/route.ts:87` (scan-queue #3)
- [H] Orphan recovery requeues genuinely-running jobs on restart → double exec — `scanQueueWorker.ts:104` (scan-queue #4)
- [H] File-watch enqueues but never wakes worker → jobs stall — `fileWatcher.ts:151` (scan-queue #2)
- [H] Task ID = requirement name → re-run overwrites live task state — `claudeExecutionQueue.ts:163` (taskrunner #2)
- [H] Architecture analysis never marked running → dedup guard dead, concurrent runs — `architecture/analyze/route.ts:55` (reflector #3)
- [M] Tinder optimistic revert by stale index → out-of-order reinsert + counter drift — `useLocalTinderItems.ts:196` (ideas #4)
- [M] Drag-end flush `setTimeout(0)` races the queue → dropped moves — `ContextLayout.tsx:103` (context #4)

### C. Orphaned / stuck lifecycle state — no recovery / reaping (4)
- [H] Orphaned "running" analyses never recover; poll loops forever; canAnalyze locked — `executive-analysis.repository.ts:174` (reflector #2)
- [H] PID orphan reaping never engages (sessionId never threaded) → leaked CLI procs — `executionManager.ts:198` (taskrunner #4)
- [M] Stale-running session reaping gaps → orphaned `pending` counted active for hours — `session.repository.ts:347` (taskrunner #5)
- [M] getDirectionPair returns orphaned half-pairs as full pairs — `direction.repository.ts:662` (manager #4)

### D. Remote-control security — auth / ownership / injection (5)  ⚠ FLAGGED — design decision, not a quick fix
- [C] Mesh + Fleet dispatch commands with zero auth — `mesh/commands/route.ts:101`, `fleet/route.ts:228` (remote #1)
- [C] No device-ownership model → cross-tenant takeover/deletion — `commands/route.ts:130` (remote #2)
- [C] PATCH /devices wrong-target mutation — `devices/[id]/route.ts:87` (remote #3)
- [H] PostgREST `.or()` filter injection via unvalidated id — `mesh/commands/route.ts:75` (remote #4)
- [H] Fleet unvalidated command_type + unbounded fan-out (DoS) — `fleet/route.ts:249` (remote #5)

### E. DB / data-integrity foundation (6)
- [C] Nested-transaction migration crash — `migration.utils.ts:256` (database #1)
- [H] `buildUpdateStatement` double-binds `updated_at` → wrong-column writes — `repository.utils.ts:208` (database #2)
- [H] Migration success recorded outside txn → re-runs non-idempotent DDL — `migration.utils.ts:264` (database #3)
- [H] `batchMoveContexts` CASE without ELSE → NULLs group_id if id lists drift — `context.repository.ts:273` (context #3)
- [M] No shared safe-parse for object JSON columns → crash or silent loss on read — `repository.utils.ts:253` (database #4)
- [M] WAL / foreign_keys pragmas fire-and-forget, never verified — `sqlite.driver.ts:99` (database #5)

### F. Computed / reported-data correctness (3)
- [H] `getChangedFiles` uses `git diff HEAD~1` → mis-attributes unrelated commits as task output — `claudeExecutionQueue.ts:136` (taskrunner #3)
- [H] X-Ray edge IDs directional-keyed, never match producer → connections never light — `XRaySystemMap.tsx:644` (docs #2)
- [M] Impact simulator compares context-id to file-path → self-exclude fails, inflated estimates — `staticAnalyzer.ts:70` (docs #4)

### G. Privileged-surface input validation (2)
- [H] `/observability/register` ingests unvalidated/unauth external payloads → stats corruption — `observability/register/route.ts:13` (workspace #2)
- [H] git `/branches` unbounded `exec` fan-out → dev-server DoS on large workspace — `git/branches/route.ts:32` (workspace #3)

### H. Cross-cutting data leak (1)
- [H] proposalAdapter passes `projectPath` into `contextDescription` slot → local path leaks into rationale + generated requirements — `ImplementationProposalBridge.tsx:56` (manager #3)

### I. UI polish & component hygiene (8)
- [H] System-map nodes overlap/overflow with many groups in a layer — `SystemMap/helpers.ts:109` (docs #3)
- [M] PreviewModal kills its own exit animation (abrupt close) — `PreviewModal.tsx:162` (workspace #4)
- [M] Map "All Changes" panel always hints "Select a group to filter" — `ManagerLayout.tsx:223` (manager #5)
- [M] Effort/Impact "0" scores dropped via truthiness guard; Buffer vs IdeaCard inconsistent — `BufferItem.tsx:63` (ideas #5)
- [L] Health tooltip never repositions on scroll, detaches from anchor — `ContextHealthIndicator.tsx:65` (context #5)
- [L] Hot Paths bar divide-by-zero → `NaN%` width — `XRayHotPathsPanel.tsx:186` (docs #5)
- [L] Trigger "Starting…" loading state is dead code → double-submit risk — `ExecutiveAnalysisTrigger.tsx:31` (reflector #5)
- [L] Orphaned `ComponentGrid` dead code, drifted from `ComponentTable` — `ComponentGrid.tsx:13` (workspace #5)

---

## Triage themes summary

| Theme | Count | Why it's a wave, not isolated fixes |
|---|---:|---|
| A. Success theater / silent failure | 10 | One mental model: "verify the thing happened before reporting success." Fixes share a guard pattern. |
| B. Concurrency / double-execution | 7 | State-transition guards on the shared queue/lifecycle; fixing them together prevents whack-a-mole. |
| C. Orphaned / stuck lifecycle | 4 | Reaping/lease design; touches session + analysis + pair lifecycles with one recovery model. |
| D. Remote-control security ⚠ | 5 | Needs an auth + ownership model — a design task, not a wave. **Flagged for decision.** |
| E. DB / data-integrity foundation | 6 | The data layer every feature passes through; batch these so migration/txn changes land coherently. |
| F. Computed-data correctness | 3 | Attribution/keying bugs; verifiable by tracing producer→consumer. |
| G. Privileged-surface validation | 2 | Input validation + resource caps on HTTP ingest / subprocess fan-out. |
| H. Cross-cutting data leak | 1 | Single-call argument fix. |
| I. UI polish & hygiene | 8 | Localized component fixes; low risk, batch last. |

---

## Suggested fix-wave split

> Each wave is one focused session with a shared mental model. Highest value/lowest risk first.
> **Wave 0 (FLAGGED) is held for a user decision — not auto-fixed.**

- **Wave 1 — Critical "don't report success that didn't happen" (5):** scan-queue #1, taskrunner #1, context #1, reflector #1, workspace #1. All critical/high, small diffs, immediate value.
- **Wave 2 — Concurrency & double-execution guards (5):** scan-queue #3, #4, #2, taskrunner #2, reflector #3.
- **Wave 3 — Orphan/zombie lifecycle recovery (4):** reflector #2, taskrunner #4, #5, manager #4.
- **Wave 4 — DB / data-integrity foundation (6):** database #1, #2, #3, context #3, database #5, #4.
- **Wave 5 — Computed-data correctness + dead routes/leaks (5):** taskrunner #3, docs #2, docs #4, context #2, manager #3.
- **Wave 6 — UI dead actions / mock data / X-Ray wiring (6):** manager #1, manager #2, ideas #2, ideas #3, ideas #5, docs #1.
- **Wave 7 — Polish (7):** docs #3, workspace #4, manager #5, ideas #4, context #5, docs #5, reflector #5, workspace #5.
- **Wave 0 — Remote-control security (5, FLAGGED):** remote #1–5. Needs an auth/ownership design decision; the surface uses a Supabase service-role key and may be intentionally local-trust or slated for removal. Present before touching.

---

## How this scan was run

- **Scanners:** combined `bug_hunter` + `ui_perfectionist` role prompts (from `src/lib/prompts/registry/agents/`), one general-purpose subagent per context, 5 findings each.
- **Scope:** 10 live contexts (≥74% files surviving) of vibeman's 19-context DB map. Project id `c32769af-…`. Context map + file lists read from the committed `database/goals.db` (the Vibeman API was unreachable — a different app occupies port 3000).
- **Method:** read-only analysis; each subagent wrote one report and replied with terse stats. Orchestrator read only the replies during scanning, then the reports for this INDEX.
- **Files read by scanners:** ~165 across all 10 runs (in-scope + load-bearing collaborators).
- **Verification:** finding counts cross-checked via `> Total:` headers (50) and `**Severity**:` bullets (50).
- **Fix discipline:** fixes land on branch `vibeman/bug-ux-fixes` off HEAD, with each `git add` scoped to only edited files so the in-progress 708-file `headless-slim` refactor stays uncommitted and separate.
