# TaskRunner & Claude Code — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495678179_f22692p
> Group: Code Execution & Automation
> Files read: ~14
> Total: 5 (Critical: 1, High: 3, Medium: 1, Low: 0)

## 1. Missing CLI silently "succeeds" as a real execution (simulation success-theater)
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: silent-failure / success-theater
- **File**: src/app/Claude/sub_ClaudeCodeManager/executionManager.ts:331-350
- **Scenario**: `claude.cmd` not in PATH (auth not done, fresh machine, PATH glitch). `spawn` fires `'error'` with ENOENT. The handler logs "WARNING: ... using simulation mode" and resolves `{ success: true, output: '[SIMULATION MODE...]', capturedClaudeSessionId: 'simulated-<ts>' }`.
- **Root cause**: Treating "CLI not installed" as a benign fallback rather than a hard failure — assumption that a missing binary is a dev convenience, not a real run.
- **Impact**: Queue marks the task **completed**, fires `emitTaskCompleted` / `emitTaskExecutionCompleted(success:true)`, resolves collective-memory applications as `'success'`, runs `performTaskCleanup` (deletes the requirement file, flips idea status). No code was ever written. A fake `simulated-…` session id can even be persisted and `--resume`'d later. Self-healing and metrics are poisoned. Worst kind of silent failure: data-destructive on a no-op.
- **Fix sketch**: On ENOENT, `resolve({ success:false, error:'Claude CLI not found…' })`. Remove simulation entirely or gate it behind an explicit `VIBEMAN_SIMULATE=1` env flag, never the default path.
- **Value**: effort 2 / impact 10 / risk 2

## 2. Windows `shell:true` spawn leaks zombie CLI on kill/abort/timeout
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: zombie-process / resource-leak
- **File**: src/lib/claude-terminal/cli-service.ts:595-600, 851-861, 1165; src/app/Claude/sub_ClaudeCodeManager/executionManager.ts:188-193, 366-372
- **Scenario**: On Windows the process is spawned with `shell: true` (`spawn('claude.cmd', …, { shell: true })`), so the OS child is a `cmd.exe` wrapper that launches the real `node claude` underneath. `childProcess.kill()` (abort, 100-min timeout, queue cancel) signals **only the cmd.exe shell**; the underlying node CLI keeps running, holding the model session, file handles, and CPU.
- **Root cause**: Assumption that `kill()` terminates the whole process tree. With `shell:true` the grandchild is detached from the signal target. `process.kill(pid)` records only the shell's PID for orphan reaping too.
- **Impact**: Orphaned Claude processes after every abort/timeout on Windows (the documented primary platform). They count against nothing, exhaust RAM (~200-500MB each), and can keep mutating the repo after the user "aborted". `MAX_CONCURRENT_EXECUTIONS=4` is bypassed because zombies aren't in the map.
- **Fix sketch**: Spawn with `{ detached:true }` and kill the process group, or use `taskkill /pid <pid> /T /F` on win32; record the real CLI pid, not the shell's, for orphanReaper.
- **Value**: effort 5 / impact 8 / risk 4

## 3. Abort / DELETE never reconciles the cli-task-registry → stuck "running" + false auto-complete
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: stuck-state / state-desync
- **File**: src/app/api/cli-task-registry/route.ts:116-124; src/lib/claude-terminal/cli-service.ts:1159-1170; src/app/api/claude-terminal/query/route.ts:139-172
- **Scenario**: A task is registered `running` in the in-memory `taskRegistry`. The user aborts via `DELETE /api/claude-terminal/query` → `abortExecution()` flips the CLIExecution to `aborted` but **never POSTs `complete` to the registry**. The registry entry stays `running` until the 10-min stale timeout. On the next `start` for that session, the code *assumes the client is authoritative* and silently auto-completes the stale entry (lines 116-124) — masking a genuinely orphaned/aborted run as "completed".
- **Root cause**: Two independent sources of truth (registry vs. CLIExecution map vs. session DB) with no write on the abort path; the `start` handler "trusts the client" to paper over the gap.
- **Impact**: Aborted/failed tasks surface as completed; a session that crashed mid-run blocks new starts for 10 min or gets falsely marked done. Registry status is unreliable for the very "stuck-state prevention" it claims to provide.
- **Fix sketch**: In `abortExecution` / DELETE handler, POST `action:'complete', status:'failed'` (or DELETE the record). Replace the "auto-complete on new start" heuristic with an explicit liveness check (PID/`isExecutionAlive`).
- **Value**: effort 3 / impact 7 / risk 3

## 4. Session-limit detected on retry path is re-queued as a generic failure → retry storm
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: race / retry-storm / rate-limit-bypass
- **File**: src/app/Claude/lib/claudeExecutionQueue.ts:707-718, 494-521
- **Scenario**: `executeRequirement` only sets `sessionLimitReached` when the **process exits non-zero** AND the limit keyword is on stdout/stderr (executionManager.ts:296-313). If the CLI exits 0 but the *result* event carries `is_error` for a quota/overage (or the keyword text isn't matched), the queue takes the `else` branch and calls `attemptHealing`. `detectErrorType` may classify it as `unknown`/`tool_failure` rather than `rate_limit`, so instead of the 60s backoff it either drops out (unknown) or re-runs immediately with a prompt patch — hammering the rate-limited endpoint up to 3×.
- **Root cause**: Rate-limit classification depends on brittle substring matching of exit-code-1 output; the success/limit/failure trichotomy has a gap when the CLI signals overage without a non-zero exit.
- **Impact**: Burns subscription quota and wall-clock during an active rate limit; the backoff (`rateLimitBackoffUntil`) is the *only* throttle and it's bypassed on misclassification.
- **Fix sketch**: Classify rate-limit from the structured `result.is_error`/`rate_limit_event` already parsed in cli-service, not only stderr substrings; on any limit signal route to `handleTaskSessionLimit` (no healing retry).
- **Value**: effort 4 / impact 7 / risk 3

## 5. Zero tests on the execution engine's status machine, spawn handling, and retry gating
- **Severity**: Medium
- **Lens**: test-mastery
- **Category**: test-gap (blast-radius)
- **File**: src/app/Claude/lib/claudeExecutionQueue.ts (whole), src/app/api/cli-task-registry/route.ts, src/app/db/repositories/session.repository.ts; only existing test: src/app/features/TaskRunner/lib/executionStrategy.test.ts (capability flags only)
- **Scenario**: The primary execution engine has **no** unit tests. Untested invariants with high blast radius: (a) `addTask` dedup — second submit of an in-flight requirement must return the existing task, not clobber it (lines 193-200); (b) `attemptHealing` gating — `unknown`/`permission_error` must NOT retry, `rate_limit` must back off not patch, `timeout` only retries once (494-521); (c) `finally` guard flips a stuck `running` → `failed` (742-750); (d) `getActive` stale-threshold excludes sessions whose heartbeat lapsed (session.repository.ts:89-102); (e) registry `start` auto-completes a prior running task only for a *different* taskId.
- **Root cause**: Tests pinned to a trivial pure function (strategy capabilities) while the stateful orchestration — exactly where the bugs above live — has no assertions.
- **Impact**: Any refactor of status transitions, dedup, or healing silently regresses with green CI. These paths gate every automated code change in the product.
- **Fix sketch**: Inject/mock `executeRequirement`; LLM-generatable table tests over the status machine + `attemptHealing(errorType, attempt) → {requeued, status}` truth table; a `getActive` test with a fabricated stale `updated_at`.
- **Value**: effort 4 / impact 7 / risk 2
