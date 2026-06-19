# Bug-Test Fix Wave 8 — Lifecycle / resource / silent-failure tail

> 5 atomic fix commits closing **4 High + 1 Medium** (docs #4, debt #2, taskrunner #2,
> scan-queue #2, integrations #5). The remaining discrete *bugs* (vs. test-coverage
> gaps) across process lifecycle, resource leaks, streams, and success-theater.
> Baseline: tsc source **0**, vitest **564/564** green. Zero regressions.
> Branch `vibeman/bug-test-fixes-2026-06-19`.

## Commits

| # | Commit | Finding | Sev |
|---|---|---|---|
| 1 | `c4c8f53d` | docs #4 | H |
| 2 | `76a49207` | debt #2 | H |
| 3 | `6dc6c1ee` | integrations #5 | M |
| 4 | `49f2ee27` | taskrunner #2 | H |
| 5 | `5dfe4eea` | scan-queue #2 | H |

## What was fixed

- **taskrunner #2 — Windows zombie CLI.** CLI processes spawn with `shell: isWindows`, so the OS child is a `cmd.exe` wrapper and `childProcess.kill()` (abort / 100-min timeout / cancel) signaled only the shell — the real `node claude` grandchild kept running, holding the session, file handles, and ~200-500MB, and (not being in the execution map) bypassed `MAX_CONCURRENT_EXECUTIONS` and could keep mutating the repo post-"abort". Added `killProcessTree()` (win32: `taskkill /pid <pid> /T /F`; else `kill()`) and wired it into all three kill sites.
- **scan-queue #2 — `maxConcurrent` was inert.** `processQueue` claimed one item and awaited it to completion, so the worker ran strictly one scan at a time and raising `maxConcurrent` did nothing (a slow scan head-of-line-blocked the rest). Now loops while under the concurrency budget, firing each `processQueueItem` as a tracked un-awaited promise whose `.finally` frees the slot. **`maxConcurrent:1` (the default) is unchanged** — only an explicitly raised value now takes effect.
- **docs #4 — SSE dead-subscriber accumulation.** `addXRayEvent` never removed a subscriber whose controller was torn down before its abort handler ran, so under the store's 5s reconnect churn every broadcast paid a throw/catch per stale closure. Now iterates a snapshot and deletes any callback that throws.
- **debt #2 — success-theater stub.** `generate-packages` returned an empty 200 payload (the generator doesn't exist), so the store reported `completed` with 0 packages — a dead marquee feature presenting as healthy. Now returns **501**; the store's `!response.ok` path surfaces `status:'error'` + a reason.
- **integrations #5 (M) — arbitrary-root template scan.** POST + GET `?countOnly` passed the raw `projectPath` to glob's `cwd` after only a `stat()`, so any path/symlink walked and read arbitrary `*/*/*.ts` into the DB. Both paths now `realpath()` the input and require a `projectDb`-registered project root (reusing `validatePathWithinAllowedRoots` from the W1 generate fix).

## Verification

| Gate | Baseline | After Wave 8 |
|---|---|---|
| tsc (source, excl. `.next`) | 0 | **0** |
| vitest | 564/564 | **564/564** green |

## Residuals (logged)

- **taskrunner #2 orphan-reaper on restart** still records the shell pid; the live-zombie path (abort/timeout/cancel) is fixed, but the server-restart reaper could use `killProcessTree` too — smaller follow-up.
- **integrations #5 glob symlink-follow** inside a confined, registered root is now low-risk (the project is trusted); `follow:false`/depth-cap in the scanner is an optional hardening.

## Cumulative status (Waves 1–8)

- **Closed: 16 Critical + 28 High + 1 Medium + cleanup** (50 fix/cleanup commits + 8 wave docs).
- **Test suite green: 564/564.** **Live map: 19 → 16 contexts.**
- **Deferred (logged, with rationale):** remote #1 (auth decision), scan-queue #3 abort-propagation, taskrunner #3 abort-reconcile (FE), taskrunner #4 global backoff, taskrunner #2 restart-reaper, orphaned DB tables, moderate context refresh, cross-task vitest suite.
- **Remaining per INDEX:** the tail is now overwhelmingly **test-coverage gaps** (test-mastery "zero tests on X" findings) plus ~28 Medium / 2 Low — few discrete bugs left.
</content>
