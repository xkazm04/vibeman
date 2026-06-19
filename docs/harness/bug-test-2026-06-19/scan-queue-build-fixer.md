# Scan Queue & Build Fixer — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495689998_phusqc3
> Group: Code Execution & Automation
> Files read: ~16
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. Scan→queue-item link uses a global "latest scan" lookup, not the scan this run produced
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: wrong-result / data-corruption / auto-merge mis-target
- **File**: src/lib/scanQueueWorker.ts:408 (and the consumer at :437-441, :477)
- **Scenario**: `processQueueItem` finishes the LLM scan, then calls `ideaRepository.getLatestScanId(queueItem.project_id, queueItem.scan_type)` — `SELECT scan_id FROM ideas WHERE project_id=? AND scan_type=? ORDER BY created_at DESC LIMIT 1`. This is keyed only on (project, scan_type), **not** on the scan row this execution created. If anything else writes a newer scan of the same type between the LLM finishing and this query — a concurrent manual scan from `/api/scans`, a file-watch/git-push trigger, the very next same-type queue item, or even row-clock ties at second granularity — this item links to and then **auto-merges the wrong scan's ideas** (`getIdeasByScanId(queueItem.scan_id)` at :477, accepting impact=3/effort=1 ideas from a foreign scan).
- **Root cause**: Design assumes "the most recent scan of this type for the project == the scan I just ran." `executeContextScan` returns only an `ideaCount`, never the `scanId` it created, so the worker reconstructs the link by guessing.
- **Impact**: Cross-scan idea linkage + auto-accept of ideas that were never reviewed for this queue item; `result_summary` ("Generated N ideas") attached to the wrong scan; silent under default `maxConcurrent:1` because the data error is invisible.
- **Fix sketch**: Have `executeLlmScan`/`executeScan` return the created `scanId`; thread it back so the worker calls `linkScan(queueItem.id, returnedScanId, ...)` and `handleAutoMerge` reads `getIdeasByScanId(returnedScanId)`. Delete the `getLatestScanId` heuristic.
- **Value**: effort 4 / impact 9 / risk 3

## 2. `maxConcurrent > 1` never parallelizes — poll claims one item then blocks the whole cycle
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: concurrency / success-theater config / throughput
- **File**: src/lib/scanQueueWorker.ts:291-330 (`processQueue`), :251-284 (`poll`)
- **Scenario**: `processQueue` checks `currentlyProcessing.size >= maxConcurrent`, then claims exactly **one** item via `claimNextPending()` and `await this.processQueueItem(queueItem)` to completion before returning. `poll()` awaits `processQueue()` fully, then sleeps. So even with `maxConcurrent: 4` the worker runs strictly one scan at a time; the set never holds more than one entry, and the `>= maxConcurrent` guard is dead. Config exposed via PATCH `/worker/config` is honored in the struct but has no runtime effect.
- **Root cause**: Single sequential poll loop conflated with the concurrency limiter; the design needs a loop that claims-and-dispatches up to `maxConcurrent - currentlyProcessing.size` items *without awaiting* each before claiming the next.
- **Impact**: Queue drains 1×; users who raise `maxConcurrent` get no speedup (silent). A slow LLM scan head-of-line-blocks every other queued scan for its full `scanTimeoutMs` (up to 5 min).
- **Fix sketch**: In `processQueue`, loop `while (currentlyProcessing.size < maxConcurrent)` claiming items, and fire `processQueueItem(item)` as a tracked un-awaited promise (add/remove from `currentlyProcessing` in its `.finally`); return whether any were claimed.
- **Value**: effort 5 / impact 7 / risk 5

## 3. Cancel-during-run race: worker clobbers a user's `cancelled` status back to `completed`/`failed`
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: lost-update / state machine / CAS-missing
- **File**: src/lib/scanQueueWorker.ts:419 & :446 (`updateStatus`), src/app/db/repositories/scanQueue.core.repository.ts:169-204
- **Scenario**: An item is `running`. User hits DELETE `/api/scan-queue/[id]` → `updateStatus(id,'cancelled')`. The worker is still mid-`processQueueItem`; the AbortController is never wired to cancellation (DELETE doesn't signal the worker), so the in-flight scan keeps running and, on completion, unconditionally calls `updateStatus(queueItem.id, 'completed')` (or `'failed'`). `updateStatus` does a blind `UPDATE ... WHERE id = ?` with **no status precondition**, so it overwrites the user's `cancelled` with `completed`/`failed`, plus auto-merge may still fire on a cancelled item.
- **Root cause**: Terminal-state writes assume the worker is the sole writer of status once `running`; there's no compare-and-set on the prior status and no abort propagation from the cancel route to the worker's AbortController.
- **Impact**: Cancellation silently ignored — ideas auto-accepted for a job the user cancelled; UI shows `completed` for a cancelled scan. Wasted LLM tokens (scan not actually aborted).
- **Fix sketch**: Make terminal `updateStatus` CAS on `WHERE id=? AND status='running'` (return null/skip auto-merge if 0 rows); register per-item AbortControllers in a map keyed by id so DELETE can `.abort()` the live run.
- **Value**: effort 4 / impact 7 / risk 4

## 4. Queue worker + claim/watermark logic has zero real tests; existing test mocks a non-existent module
- **Severity**: Medium
- **Lens**: test-mastery
- **Category**: missing-coverage / success-theater test
- **File**: tests/api/scan-queue/route.test.ts:30-40 (and absence of any scanQueueWorker / claimNextPending test)
- **Scenario**: The only test file `vi.mock('@/app/db', () => ({ scanQueueDb: {...} }))` mocks a `scanQueueDb` with methods (`updateQueueItem`, `getNextQueuedItem`) that **do not exist** on the real `scanQueueRepository` (real names are `updateStatus`/`updateProgress`/`claimNextPending`). Every assertion runs against ad-hoc in-test SQL, never importing the route or repository — so it passes regardless of production behavior. The highest-risk code (`claimNextPending` CAS at scanQueue.core.repository.ts:79-119, `resetOrphanedRunning` stale-watermark at :291-306, the whole worker poll/auto-merge) has **no** test.
- **Root cause**: Tests were written against an imagined API surface and frozen as success theater; no invariant is anchored to real exported functions.
- **Impact**: Findings #1–#3 and #5 are all undetectable by CI; any refactor of claim/recovery silently regresses duplicate-execution and lost-update guarantees.
- **Fix sketch**: Add a real better-sqlite3 test importing `scanQueueCoreRepository`: (a) two `claimNextPending()` calls on one queued row → exactly one non-null, one null (CAS); (b) `resetOrphanedRunning(10)` requeues a `started_at` older than cutoff but leaves a fresh `running` untouched; (c) auto-merge accepts only impact=3/effort=1 within a transaction. Delete the mocked-`scanQueueDb` file.
- **Value**: effort 4 / impact 7 / risk 2

## 5. Build scanner kills only the top-level shell on timeout, orphaning the real `tsc`/`next` child
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: zombie-process / resource-leak
- **File**: src/app/api/build-fixer/lib/buildScanner.ts:202-209 (timeout), :181-185 (spawn)
- **Scenario**: `executeBuildCommand` spawns `cmd.exe /c <command>` (or `bash -c`) and on the 5-min timeout calls `buildProcess.kill('SIGTERM')` then `SIGKILL` on **only the shell**. The shell's child (`tsc`/`next build`/`eslint`) is a separate process in its own tree and is not reaped — on Windows especially `kill` does not cascade to grandchildren. The `'close'` may also have already resolved the promise, so the kill timer fires against a finished shell while the heavy compiler keeps running.
- **Root cause**: Assumes killing the shell kills the whole command tree; no `detached`+process-group kill (`process.kill(-pid)` / `taskkill /T /F`), and the timeout timer is never cleared on normal `close`.
- **Impact**: A hung/slow build leaks orphaned compiler processes that pin CPU/memory and hold file locks in the scanned project; repeated build-fixer runs compound it. Also the dangling `setTimeout` keeps a handle alive after the promise resolves.
- **Fix sketch**: `spawn(..., { detached: true })` and on timeout kill the group (`process.kill(-buildProcess.pid)` POSIX / `taskkill /PID <pid> /T /F` Windows); store the timer and `clearTimeout` it inside the `'close'`/`'error'` handlers.
- **Value**: effort 3 / impact 5 / risk 3
