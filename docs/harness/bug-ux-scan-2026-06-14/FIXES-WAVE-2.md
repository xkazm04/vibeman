# Bug-UX Scan — Fix Wave 2 — Concurrency & double-execution guards

> 4 commits, 4 findings closed. 1 finding (taskrunner #2) deferred — its file is in the user's WIP.
> Branch: `vibeman/bug-ux-fixes`. Baseline preserved: tsc 0 → 0; scan-queue route tests 14/14 pass.
> Mental model: guard every state transition so one job runs exactly once.

## Commits

| # | Commit | Finding | Severity | File |
|---|---|---|---|---|
| 1 | `c4313b3f` | scan-queue #3 — client PATCH overwrites worker status | High | `api/scan-queue/[id]/route.ts` |
| 2 | `ae548a32` | scan-queue #4 — orphan recovery requeues running jobs | High | `db/repositories/scanQueue.core.repository.ts` |
| 3 | `cbef7b03` | scan-queue #2 — file-watch never wakes worker | High | `lib/fileWatcher.ts` |
| 4 | `ba65aa60` | reflector #3 — arch analysis never marked running | High | `lib/architecture/analysisAgent.ts` |

## What was fixed

1. **PATCH /scan-queue/[id] no longer corrupts in-flight jobs.** The handler wrote any client-supplied status with no validation. A stale UI retry/cancel or double-submit could move a worker-owned `running` job back to `queued`, and `claimNextPending` would re-claim and run it a second time concurrently. Now: unknown status → 400; setting `queued`/`running` on a currently-`running` job → 409.
2. **Worker restart only requeues genuinely stale jobs.** `resetOrphanedRunning` reset *every* `running` row to `queued` with no age threshold, so a job genuinely in flight (LLM scan, or a concurrent process / HMR reload) got reset, re-claimed and double-executed. Now gated on `started_at` older than a threshold (default 10 min) or null.
3. **File-watch auto-scans actually run.** `triggerScans` enqueued items but never woke the worker (which is only started by `POST /api/scan-queue/worker`), so file-change scans sat in `queued` forever on a fresh process, or waited up to the 60s adaptive poll. Now starts (idempotent) and notifies the worker after enqueuing.
4. **Architecture-analysis dedup guard now works.** The agent created the row as `pending` and never flipped it to `running`, so `getRunning` (status=`running`) always returned null — two concurrent POSTs both passed the guard. Both create sites now call `startAnalysis(analysisId)` immediately after `create`.

## Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | 0 errors (unchanged) |
| `tests/api/scan-queue/route.test.ts` | 14/14 pass |
| ESLint (changed files) | 0 errors |
| WIP safety | working tree back to 708; only my 4 files committed |

## Patterns established (catalogue items 5–7)

5. **The client status surface must not write worker-owned state.** A queue/job row in a worker-claimed state (`running`) is owned by the worker; an HTTP PATCH must validate against an allow-list and refuse transitions that would let the scheduler re-claim a live job. (scan-queue #3)
6. **Crash recovery needs an age/lease threshold, not "reset all."** "Requeue everything in `running` on startup" cannot distinguish a crashed job from one actively running in another live process — recover only what is provably stale (`started_at` past a threshold), or use a heartbeat/lease. (scan-queue #4)
7. **Two-phase async work must mark itself `running` at phase 1.** A "create pending → external callback completes" handshake whose dedup guard filters on `running` is dead unless something flips `pending`→`running` at start. Flip it in the same call that creates the row. (reflector #3)

## Deferred

- **taskrunner #2 (Task ID = requirement name → re-run overwrites live task state).** Lives in `src/app/Claude/lib/claudeExecutionQueue.ts`, which is part of the in-progress `headless-slim` refactor (currently modified, uncommitted). Editing it would entangle the user's WIP into the fix commit. Pick up once that file is committed/stashed.

## What remains (per INDEX)

Wave 3 — orphaned/zombie lifecycle (4): reflector #2, taskrunner #4/#5, manager #4.
Waves 4–7 as listed in `INDEX.md`. Plus taskrunner #2 (deferred above) and the remote auth/ownership design (remote #1/#2).
