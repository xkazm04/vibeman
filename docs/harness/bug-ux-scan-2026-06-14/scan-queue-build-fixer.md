# Scan Queue & Build Fixer — bug-hunter + ui-perfectionist scan

> Context: Scan Queue & Build Fixer
> Total: 5 findings (Critical: 1, High: 3, Medium: 1, Low: 0)

## 1. Build "success" reported when the build command never ran or output is unparseable

- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: silent-failure / success-theater
- **File**: src/app/api/build-fixer/lib/buildScanner.ts:435-460 (also executeBuildCommand:193-199)
- **Scenario**: `scanBuildErrors` runs the detected/passed build command, captures `{ output, exitCode }`, logs the exit code (line 436), then **never inspects it**. It only runs two regexes over `output`. If the command exits non-zero for a reason that doesn't match the TS/ESLint regex shapes — `cmd not found` (exit 127), `tsc` not installed, an OOM crash, a Next.js/webpack stack trace, a different tsc pretty-print format, or `spawn` itself erroring (line 197-199 resolves `{ output: error.message, exitCode: 1 }`) — `parseTypeScriptErrors`/`parseESLintErrors` return `[]`. The function then returns `success: true, totalErrors: 0`. The route (build-fixer/route.ts:88) treats `totalErrors === 0` as `handleNoErrors` → "Build passed, no errors."
- **Root cause**: Equating "zero parsed errors" with "build is clean." Exit code and the failure-to-parse case are discarded.
- **Impact**: A broken build is reported green. The build-fixer creates zero fix requirements, the user/agent believes the project compiles, and real errors ship undetected. This is the worst failure mode for an auto-fix tool: it actively suppresses the signal it exists to surface.
- **Fix sketch**: When `exitCode !== 0` but `totalErrors === 0`, return `success: false` with `error: 'Build failed (exit N) but no errors could be parsed'` and include a truncated tail of `output` so the caller can see the real failure instead of a false green.

## 2. File-watch auto-scans are enqueued but the worker is never woken — jobs sit until a manual poll

- **Severity**: High
- **Lens**: bug-hunter
- **Category**: event-ordering / orphaned-jobs
- **File**: src/lib/fileWatcher.ts:151 (enqueue) vs src/app/api/scan-queue/route.ts:81 (the notify path)
- **Scenario**: The manual enqueue route calls `scanQueueRepository.createQueueItem(...)` **and then** `scanQueueWorker.notifyNewItem()` (route.ts:81) for O(1) latency. The file-watch trigger path calls `createQueueItem(...)` (fileWatcher.ts:151) but **never** calls `notifyNewItem()`. Worse, the worker only runs if something previously POSTed `/api/scan-queue/worker` (the only `scanQueueWorker.start` caller in the codebase). So on a fresh process where the watcher is enabled but the worker route was never hit, file-change scans accumulate in `status='queued'` and never execute. Even with the worker running, the just-added item waits up to the adaptive backoff (up to 60s, ADAPTIVE_POLL_INTERVALS.MAX_MS) instead of firing immediately.
- **Root cause**: The "wake the worker" responsibility lives in the HTTP route, not in the repository/enqueue primitive, so the second producer (the watcher) silently lacks it.
- **Impact**: The headline feature of file-watch ("auto-scan on change") appears dead or arbitrarily laggy; queued items look stuck. No error is surfaced.
- **Fix sketch**: Move the `notifyNewItem()` call into `createQueueItem` (or a thin `enqueueAndNotify` wrapper) so every producer wakes the worker, and lazily `scanQueueWorker.start()` when a watch config is enabled.

## 3. PATCH /api/scan-queue/[id] lets a client overwrite worker-owned status — corrupts in-flight jobs

- **Severity**: High
- **Lens**: bug-hunter
- **Category**: state-corruption / race-condition
- **File**: src/app/api/scan-queue/[id]/route.ts:87-88 → src/app/db/repositories/scanQueue.core.repository.ts:169-204
- **Scenario**: `handlePatch` calls `updateStatus(id, status, ...)` with **any** client-supplied status and no guard on the current status or value set. While the worker holds a job in `status='running'` (claimed atomically by `claimNextPending`), a concurrent PATCH (e.g. a stale UI "retry"/"cancel", or a double-submit) can set it back to `'queued'`. `claimNextPending` (core repo:97-101) then re-claims and runs the **same job a second time concurrently** with the still-in-flight execution — duplicate scans, duplicate ideas, duplicate notifications, and a `completed_at` written while it's actually still running. There is also no allow-list: an arbitrary string (`status='banana'`) is written verbatim, and `updateStatus`'s branch only stamps `completed_at` for the three known terminal values, leaving custom values with inconsistent timestamps.
- **Root cause**: The atomic claim guarantees only one *claim*, but nothing protects the `running` state afterward from external writers, and the status field is unvalidated and unconstrained at the API boundary.
- **Impact**: Double execution / wasted LLM tokens, corrupted queue rows, and lifecycle timestamps that lie. DELETE has the same shape (forces `'cancelled'` on a running job without stopping it).
- **Fix sketch**: Validate `status` against the known enum; make external transitions conditional (`WHERE id=? AND status NOT IN ('running')`) or reject client writes to `running`/`completed`; treat cancel of a running job as a cooperative signal, not a blind overwrite.

## 4. Orphan recovery requeues genuinely-running jobs, causing double execution on worker restart

- **Severity**: High
- **Lens**: bug-hunter
- **Category**: recovery-gap / race-condition
- **File**: src/lib/scanQueueWorker.ts:104-112 → src/app/db/repositories/scanQueue.core.repository.ts:288-301 (resetOrphanedRunning)
- **Scenario**: On `start()`, the worker unconditionally `UPDATE scan_queue SET status='queued' ... WHERE status='running'` for **every** running row, with no `started_at` age threshold and no worker/process identity. In dev (Next.js HMR) or if a second `/api/scan-queue/worker` POST hits a process where work is genuinely in flight, `start()` early-returns if `isRunning` (worker.ts:92) — but a *fresh* process / module reload runs the reset while the prior async `processQueueItem` may still be awaiting the LLM (`executeContextScan`). That live job is reset to `queued`, re-claimed, and executed a second time. There is no heartbeat/lease, so "stuck" and "actively running elsewhere" are indistinguishable.
- **Root cause**: Orphan detection uses status alone with zero liveness signal (no lease/heartbeat, no `started_at < now - timeout` filter).
- **Impact**: Spurious duplicate scans and duplicate token spend on every restart/reload that overlaps an in-flight job; progress resets to 0 mid-run, confusing any UI polling progress.
- **Fix sketch**: Only requeue rows where `started_at < (now - 2× scanTimeoutMs)`; add a heartbeat column updated by `updateProgress` and reset only stale ones; or stamp a worker/run id and reset only rows not owned by the current run.

## 5. File-watch "Auto-scan triggered" notification silently fails on a foreign-key violation

- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: silent-failure / sql-correctness
- **File**: src/lib/fileWatcher.ts:169-181 (insert) vs src/app/db/schema.tables.ts:224 (FK) — exercised via the in-scope scanNotification.repository.ts:24-40 and notifications route
- **Scenario**: `scan_notifications.queue_item_id` is declared `FOREIGN KEY (queue_item_id) REFERENCES scan_queue(id) ON DELETE CASCADE` (schema.tables.ts:224) and `PRAGMA foreign_keys = ON` is set in the driver (sqlite.driver.ts:105). The file-watch trigger inserts a notification with the literal `queue_item_id: 'file-watch-trigger'` (fileWatcher.ts:171), which is not a real `scan_queue.id`. better-sqlite3 throws `SQLITE_CONSTRAINT_FOREIGNKEY`. The insert is inside `triggerScans`' try/catch, so it's swallowed: the user never sees the "N scan(s) queued" notification that GET /api/scan-queue/notifications is supposed to surface.
- **Root cause**: A sentinel/non-FK value is stuffed into a column with an enforced foreign key.
- **Impact**: Auto-scan feedback never reaches the user (the queue items themselves still insert, since they're added in a separate loop earlier — but the "something happened" signal is lost). Also a needless thrown exception per file-change burst.
- **Fix sketch**: Make `queue_item_id` nullable for project-level notifications and insert `NULL` (or relax/relink the FK), or attach the notification to one of the real queue ids just created in the loop above.
