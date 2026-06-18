# Bug-Test Fix Wave 2 — Execution lifecycle & recovery (Highs)

> 4 atomic fix commits closing **3 High findings** (reflector #2, reflector #3,
> scan-queue #3). One mental model: *executions must reap zombies, dedup, and
> respect cancellation*. Baseline preserved: tsc source **0**, vitest **547/550**
> (same 3 pre-existing). Zero regressions. Branch `vibeman/bug-test-fixes-2026-06-19`.

## Commits

| # | Commit | Finding(s) | Sev |
|---|---|---|---|
| 1 | `e781f174` | reflector #2, reflector #3 | H, H |
| 2 | `8a35ac45` | scan-queue #3 | H |

## What was fixed

- **reflector #2 — zombie architecture analyses.** A workspace/project analysis stuck in `running` (CLI crash, closed tab, lost callback) made `getRunning()` return it forever, permanently blocking re-analysis of that scope and freezing the executive `architectureSummary`. Added `architectureAnalysisRepository.failStaleRunning()` (mirrors the executive repo, keyed on `COALESCE(started_at, created_at)`) and call it before the dedup check in both analyze paths.
- **reflector #3 — missing dedup on onboarding.** `analyzeNewProject` created + started an analysis *without* the `getRunning` guard `analyzeWorkspace` has, so a retried/double-clicked onboarding POST ran N concurrent project analyses all racing to `upsertMany` relationships. Added the same one-running-per-scope guard.
- **scan-queue #3 — cancel clobbered by the worker.** A user's mid-run `cancelled` (DELETE) was overwritten back to `completed`/`failed` by the worker's blind terminal `UPDATE`, and a cancelled job could still auto-merge ideas. `updateStatus` now takes an optional `expectedCurrentStatus`; the worker's terminal writes CAS on `running` and return early on a miss — no clobber, no completion notification, no auto-merge of a cancelled job.

## Verification

| Gate | Baseline | After Wave 2 |
|---|---|---|
| tsc (source, excl. `.next`) | 0 | **0** |
| vitest | 547/550 | **547/550** (same 3 pre-existing) |

## Deferred from this wave (next up — execution lifecycle)

- **taskrunner #3 — abort/DELETE doesn't reconcile the cli-task-registry.** The abort path flips the CLIExecution to `aborted` but never POSTs `complete` to the in-memory registry, which then stays `running` until a 10-min stale timeout — and a later `start` "trusts the client" and silently auto-completes the orphaned run as `completed`. Fix: POST `complete/failed` on abort + replace the auto-complete heuristic with a PID liveness check. (Multi-file: `cli-task-registry/route.ts`, `cli-service.ts`, `claude-terminal/query/route.ts` — deferred to keep this wave's quality; brittle multi-source-of-truth area.)
- **taskrunner #4 — rate-limit misclassification → retry storm.** Rate-limit detection depends on brittle exit-code-1 stderr substring matching; a quota/overage that exits 0 with `is_error` is routed to `attemptHealing` (immediate re-run) instead of the 60s backoff, hammering the rate-limited endpoint up to 3×. Fix: classify from the structured `result.is_error`/`rate_limit_event` already parsed in cli-service, route any limit signal to `handleTaskSessionLimit`.

Both have full fix sketches in `taskrunner-claude-code.md`. They sit in the
execution-queue / registry layer where rushing risks regressions, so they were
held for a dedicated session rather than degraded into this wave.

## Cumulative status (Waves 1–2)

- **Closed: 16 Critical + 4 High** across 19 fix commits + 2 wave docs, 0 regressions throughout.
- **Deferred (logged, with rationale): remote #1** (auth architecture decision), **taskrunner #3, #4** (brittle lifecycle layer), and scan-queue #3's abort-propagation half.
- Remaining per INDEX: 44 High, 28 Medium, 2 Low — plus the **context-map drift cleanup** (3 phantom contexts; deleting the stale `signal-types.test.ts` restores vitest to 550/550).
</content>
