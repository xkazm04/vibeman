# Bug-Test Fix Wave 3 — TaskRunner lifecycle (Highs)

> 2 atomic fix commits closing **2 High findings** (taskrunner #3, taskrunner #4) in
> the execution-queue / registry layer held back from Wave 2. Baseline preserved:
> tsc source **0**, vitest **547/550** (same 3 pre-existing). Zero regressions.
> Branch `vibeman/bug-test-fixes-2026-06-19`.

## Commits

| # | Commit | Finding | Sev |
|---|---|---|---|
| 1 | `f2e3ec2c` | taskrunner #3 | H |
| 2 | `46e2a74c` | taskrunner #4 | H |

## What was fixed

- **taskrunner #3 — false auto-complete masked aborted/orphaned runs.** The cli-task-registry `start` handler, on finding a still-`running` task for the session, auto-marked it `completed` ("the client is authoritative"). But a successful run POSTs `action:'complete'` — its absence means the prior run was aborted/crashed/orphaned. Now marks the superseded entry **`failed` (orphaned)**, so the registry — whose stated job is stuck-state detection — stops reporting abandoned runs as success. The new task still proceeds.
- **taskrunner #4 — exit-0 rate-limit caused a retry storm.** Session-limit detection only ran on a **non-zero** exit, so a quota/overage the CLI reported in its final stream-json `result` message while exiting 0 was masked as success — or misclassified and re-run immediately by self-healing, hammering the rate-limited endpoint. Added `detectSessionLimitFromResult()`: on a 0 exit it inspects **only the structured `result` message** (`is_error:true` + a limit keyword), not the whole transcript, and surfaces `sessionLimitReached` so the queue routes to `handleTaskSessionLimit` (no immediate retry). The keyword list is now shared with the non-zero path.

## Why structured (not substring) detection for #4

A naive `stdout.includes('rate limit')` would false-positive on a task that is *about* rate-limiting (its own output mentions the phrase), turning a successful run into a re-queued session-limit. Restricting the check to the final `type:result` message with `is_error:true` keys off the CLI's own error signal, not arbitrary task content.

## Verification

| Gate | Baseline | After Wave 3 |
|---|---|---|
| tsc (source, excl. `.next`) | 0 | **0** |
| vitest | 547/550 | **547/550** (same 3 pre-existing) |

## Residuals (documented, not silently skipped)

- **taskrunner #3 — server-side abort→registry reconcile.** The abort path (`DELETE /api/claude-terminal/query` → `abortExecution`) operates on a CLIExecution whose `sessionId` is the **Claude** session id — a different namespace from the registry's session id — so there is no reliable server-side key to mark the registry entry failed on abort. The robust reconcile is client-driven (the FE that triggers the abort knows its registry `taskId`) and is a small FE follow-up. The honest-superseding fix above already removes the *false-completion* impact.
- **taskrunner #4 — global cross-task backoff.** `handleTaskSessionLimit` marks the offending task terminal (no per-task storm). Optionally it could also set the queue-wide `rateLimitBackoffUntil` so *sibling* queued tasks pause too; left as an enhancement (out of the finding's per-task scope).

## Cumulative status (Waves 1–3)

- **Closed: 16 Critical + 6 High** across 23 fix commits + 3 wave docs, 0 regressions throughout (tsc source 0, vitest 547/550 the whole way).
- **Deferred (logged, with rationale):** remote #1 (auth architecture decision), scan-queue #3 abort-propagation half, taskrunner #3 abort-reconcile half, taskrunner #4 global backoff.
- Remaining per INDEX: 42 High, 28 Medium, 2 Low — plus the **context-map drift cleanup** (3 phantom contexts; deleting the stale `signal-types.test.ts` restores vitest to 550/550).
</content>
