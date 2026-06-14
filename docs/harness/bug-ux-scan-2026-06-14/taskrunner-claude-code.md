# TaskRunner & Claude Code — bug-hunter + ui-perfectionist scan

> Context: TaskRunner & Claude Code
> Total: 5 findings (Critical: 1, High: 3, Medium: 1, Low: 0)

## 1. Session/rate-limit detection only scans stderr, but `--output-format stream-json` writes errors to stdout
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: silent-failure
- **File**: src/app/Claude/sub_ClaudeCodeManager/executionManager.ts:292-318
- **Scenario**: A run hits the Anthropic usage/rate limit. The Claude CLI is spawned with `--output-format stream-json --verbose` (line 151-158), so it emits structured JSON events (including `result` / `rate_limit` / error events) on **stdout**, and typically exits non-zero. The completion handler computes `isSessionLimit` purely from `stderr.toLowerCase()` (line 292). The limit message is in `stdout`, so `isSessionLimit` is `false`.
- **Root cause**: The detection assumes human-readable error text lands on stderr, but stream-json routes all model/usage signalling through stdout JSON. The sibling terminal path explicitly handles a `rate_limit` event type (claude-terminal/stream/route.ts:162-172), proving limits arrive as structured stdout events — this path ignores them.
- **Impact**: A rate-limited task is misclassified as a generic `failed`. The queue then runs `attemptHealing` (claudeExecutionQueue.ts:639), which on a non-`rate_limit` classification generates a prompt patch and **immediately re-queues** (`setImmediate`) instead of backing off. With the real limit still in force, every retry fails instantly → a retry storm that burns the remaining quota and produces 3 bogus "self-healing" patches. The intended 60s `rateLimitBackoffUntil` path (line 460-471) is never taken.
- **Fix sketch**: Parse the limit signals from `stdout` JSON events (look for `result.isError` + the `rate_limit` event type / known limit strings), or scan `stdout + stderr` together in the `isSessionLimit` check. Feed that into both `sessionLimitReached` and the `rate_limit` error classification so the backoff path engages.

## 2. Task ID is the requirement name — re-running or healing a requirement silently overwrites the prior task's state
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: state-corruption
- **File**: src/app/Claude/lib/claudeExecutionQueue.ts:163 (and 189)
- **Scenario**: `addTask` sets `const taskId = requirementName` and does `this.tasks.set(taskId, task)` with a fresh `progress: []`. If a user re-runs the same requirement (or two projects share a requirement name) while the previous task is still `running`, the `Map.set` replaces the live `ExecutionTask` object. The still-running `executeRequirement` promise from the first run holds a closure over the **old** task object, so its `onProgress`/completion writes land on an orphaned object while the UI polls the new one.
- **Root cause**: Using a non-unique, user-facing string as the primary key for an in-flight process registry. There is no guard against adding a task whose id already exists in `running`/`pending` state.
- **Impact**: Lost progress, two concurrent CLI processes writing the same log file (`getLogFilePath` is keyed on requirement name too), and the `finally` block (line 670) can mark the *replacement* task "stuck/failed" when the first process's `isProcessing` flips. Cross-project collisions also mean `getProjectTasks` returns the wrong project's task.
- **Fix sketch**: Generate a unique task id (e.g. `${requirementName}-${Date.now()}` or a uuid) and expose the requirement name as a separate field; reject/return-existing when a non-terminal task with the same requirement+project already exists.

## 3. `getChangedFiles` uses `git diff HEAD~1` after every task, attributing unrelated commits as "files modified"
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: assumption-landmine
- **File**: src/app/Claude/lib/claudeExecutionQueue.ts:136-147 (callers 264, 419)
- **Scenario**: On both success and failure, the queue runs `git diff --name-only HEAD~1` in the project dir and reports the result as `filesModified` on the `taskExecutionCompleted` domain event. This assumes the task produced exactly one new commit at `HEAD`. But: (a) git operations are optional (`gitConfig.enabled`), so when git is off, `HEAD~1` diff returns whatever the user's last *manual* commit changed — completely unrelated files; (b) on **failure** no commit was made, yet it still diffs `HEAD~1`; (c) if the task committed nothing or the repo has 0/1 commits, the command errors (swallowed → `[]`).
- **Root cause**: `HEAD~1` is a fixed assumption that "the task = the latest commit." Reality is the task may make 0, 1, or many commits, or none.
- **Impact**: Downstream subscribers (signal recording, collective memory, cache invalidation) receive wrong `filesModified` sets — recording success/failure signals against files the task never touched, polluting the Brain/collective-memory feedback loop. Silent because errors are caught and return `[]`.
- **Fix sketch**: Capture `git rev-parse HEAD` before execution and diff `before..HEAD` (empty set when unchanged); only compute when `gitConfig.enabled` and the run committed, and skip entirely on failure.

## 4. PID-based orphan reaping never engages for queued TaskRunner runs (sessionId never threaded through)
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: recovery-gap
- **File**: src/app/Claude/sub_ClaudeCodeManager/executionManager.ts:198-206; src/app/Claude/lib/claudeExecutionQueue.ts:588-600
- **Scenario**: `executeRequirement` only records the spawned PID (`sessionRepository.updatePid`) when `sessionConfig?.sessionId` is set (line 198). The queue's `processQueue` calls `executeRequirement(projectPath, requirementName, projectId, onProgress, gitConfig, task.sessionConfig, healingContext)` — and for the normal execute path, `queueExecution` builds `cleanSessionConfig` only if the caller passed a `sessionConfig` (executionHandlers.ts:103). The `/execute` route body rarely includes one, so `sessionConfig` is `undefined` and no PID is ever written.
- **Root cause**: The orphan-reap mechanism (`getSessionsWithPids`/`clearAllPids`, session.repository.ts:511-533) was designed around session-backed runs, but the primary queue path executes without a session row, so its child `claude.cmd` processes are invisible to reaping.
- **Impact**: If the Next.js server restarts mid-execution (HMR, crash, redeploy), spawned Claude CLI processes are orphaned with no DB record to find/kill them — they keep running, burning tokens and holding file locks, and the corresponding in-memory `ExecutionTask` is gone (the `Map` is process-local), so the UI shows nothing. No recovery path exists.
- **Fix sketch**: Record the PID against the task/project regardless of session (e.g. a lightweight `running_processes` table keyed by taskId+projectId), and reap on startup; or always create a session row for queued runs so the existing PID-reap path applies.

## 5. Stale-running session reaping fights with the heartbeat status gate, so genuinely dead "running" sessions are reaped but completed runs that crashed mid-flight leak
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: state-corruption
- **File**: src/app/db/repositories/session.repository.ts:347-365 vs 370-381; heartbeat route src/app/api/claude-code/sessions/heartbeat/route.ts:29
- **Scenario**: `updateHeartbeat` refuses to touch any session not in `('pending','running','paused')` and returns `'inactive'` (409). The client heartbeat loop, on a 409, will stop heartbeating. Separately, `getStaleRunning(thresholdMinutes)` only finds sessions still in status `'running'`. If a CLI process dies/crashes without the completion path running `updateStatus` (e.g. server killed between `close` handler and DB write, or the run was never session-backed per finding #4), the session stays `'running'` with a frozen `updated_at`. That is correctly reaped. But the inverse — a session left in `'pending'` because the spawn threw before status flipped to running — is only caught by `getStalePending` with an **hours** threshold (line 402), so a never-started session occupies an "active" slot for hours.
- **Root cause**: Three independent staleness thresholds (running=minutes, paused/pending=hours) with no single reconciliation against actual process liveness; `pending` uses `created_at` not `updated_at`, so a heartbeat can never rescue or accelerate detection.
- **Impact**: `getActive` (line 81) keeps counting orphaned `pending` sessions as active for hours, inflating session-limit gating and the sidebar's active-session count; conversely a crash leaves the UI showing "running" until the minutes threshold elapses with no liveness check. Degraded reliability rather than data loss.
- **Fix sketch**: Cross-check `pid` liveness (process.kill(pid, 0)) during reaping instead of relying solely on time thresholds, and use a short uniform threshold for any session whose recorded PID is no longer alive.

---

### Notes / lower-confidence observations (not counted)
- `claudeExecutionQueue.addTask` accepts `provider`/`model` (params 6-7) but `queueExecution` (executionHandlers.ts:117) never passes them, so every `taskExecutionCompleted` event reports `provider/model: undefined` — harmless metadata gap, related to finding #2's signature drift.
- SSE client (`pollingManager.startSSEPolling`) and the stream route's event vocabulary (`status|change|final|done|heartbeat`) are consistent — no dangling-import or protocol-mismatch bug found there despite the headless-slim deletions; the referenced `tasks/[id]/stream` and `tasks/[id]/progress` routes both still exist.
