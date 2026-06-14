# Bug-UX Scan — Fix Wave 3 — Orphaned / zombie lifecycle recovery

> 3 commits, 3 findings closed. 1 finding (taskrunner #4) deferred — its file is in the user's WIP.
> Branch: `vibeman/bug-ux-fixes`. Baseline preserved: tsc 0 → 0; tests 539/542 (same 3 deleted-Brain failures).
> Mental model: never let a dead job hold a slot or lock the user out — reap zombies, don't count the dead.

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `08fc5df8` | reflector #2 — orphaned running analyses never recover | High | `executive-analysis.repository.ts`, `reflector/executiveAnalysisAgent.ts` |
| 2 | `af92a4a5` | taskrunner #5 — stale sessions counted active for hours | Medium | `session.repository.ts` |
| 3 | `be99407c` | manager #4 — orphaned direction half-pairs unsignalled | Medium | `direction.repository.ts` |

## What was fixed

1. **Executive analysis recovers from a missing completion callback.** A `running` analysis whose `[analysisId]/complete` callback never arrived (CLI crash, closed tab, lost request) stayed `running` forever: `getStatus` reported `isRunning`, `canAnalyze` stayed false (permanent per-scope lockout), and the client polled every 5s for the life of the tab. `cleanupStale` only reaps `failed`/`pending`. Added `failStaleRunning()` (marks `running` rows older than 15 min as `failed`), called from `getStatus` (self-heals on the next poll) and `startAnalysis` (so a zombie can't block a new run).
2. **Stale sessions stop inflating the active count.** Nothing actually reaps stale sessions — `getStaleRunning`/`getStalePending`/`getStalePaused` have **zero callers** anywhere in the repo. So a spawn that threw before flipping to `running`, or a CLI that crashed mid-run, left a `pending`/`running` session that `getActive` counted indefinitely, inflating session-limit gating and the sidebar count. `getActive` now excludes `pending`/`running` sessions whose heartbeat (`updated_at`) is older than a threshold (default 15 min); `paused` sessions (intentionally idle) still always count.
3. **Orphaned direction half-pairs are now detectable.** Paired directions are created by two independent POSTs sharing a `pair_id`; if the second never lands, `getDirectionPair` returned a one-sided half-pair with no signal it was broken. Added a `complete` flag (both halves present) so callers can avoid presenting a one-sided "A vs B" comparison as whole. (Accumulation/visibility is already handled: `getPendingDirectionsGrouped` demotes incomplete pairs to singles, and `acceptPairedDirection`'s sibling-reject is already a 0-row no-op when the sibling is absent — so this fix closes the remaining *signal* gap the finding named.)

## Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | 0 errors (unchanged) |
| Tests | 539/542 (same 3 deleted-Brain import failures; no regression) |
| ESLint (changed files) | 0 errors |
| WIP safety | working tree back to 708; only my 3 commits' files touched |

## Patterns established (catalogue items 8–10)

8. **A polled status endpoint is the natural place to self-heal zombies.** If the UI already polls `getStatus` every few seconds, reaping stale `running` rows *inside* `getStatus` makes the system recover without a separate cron — the next poll clears the lockout. (reflector #2)
9. **"Active" must mean "alive," not just "non-terminal status."** Counting every `pending`/`running` row as active assumes something reaps the dead ones; when nothing does, gate on a liveness signal (recent heartbeat) instead of status alone. (taskrunner #5)
10. **Reaper helpers with zero callers are worse than no helpers** — they read as "handled" while nothing runs. Grep for callers before trusting a `getStale*`/`cleanup*` method; if there are none, the recovery is dead. (taskrunner #5)

## Deferred (WIP overlap)

- **taskrunner #4 (PID orphan-reaping never engages — sessionId never threaded).** The fix must thread a sessionId through `src/app/Claude/lib/claudeExecutionQueue.ts`, which is part of the uncommitted `headless-slim` refactor. Joins **taskrunner #2** in the deferred bucket — pick up both once that file is committed/stashed.

## What remains (per INDEX)

Wave 4 — DB integrity (6): database #1–5 + context #3. Wave 5 — computed-data correctness (5). Wave 6 — UI dead actions / mock data (6). Wave 7 — polish (7). Plus deferred taskrunner #2 & #4, and the remote auth/ownership design (remote #1/#2).
