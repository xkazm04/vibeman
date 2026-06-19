# Bug-Test Fix Wave 12 — Mediums (robustness / correctness)

> 6 atomic fix commits closing **6 Medium findings** — the highest-value discrete bugs
> from the Medium tier (idempotency, graceful degradation, crash guards, resource
> leaks, lost signals, wrong aggregation). Baseline: tsc source **0**, vitest
> **604/604** green. Zero regressions. Branch `vibeman/bug-test-fixes-2026-06-19`.

## Commits

| # | Commit | Finding |
|---|---|---|
| 1 | `90910265` | context-mgmt #4 |
| 2 | `107d9773` | ideas #5 |
| 3 | `9c60d678` | goals #5 |
| 4 | `4e3c05a4` | scan-queue #5 |
| 5 | `5de22ab4` | dependencies #5 |
| 6 | `499a178c` | docs #5 |

## What was fixed

- **context-mgmt #4 — drag crash.** `queueMove` spread `find(...)!` for a context that a drag-end could reference after it was removed/replaced/refreshed away, throwing inside the set updater. Now bails cleanly when the context is gone.
- **ideas #5 — stuck card.** `rejectIdea` threw a 500 on a terminal idea (`implemented→rejected` illegal); the tinder client only maps 409 to success, so the card re-inserted forever. Now `authorize`-checks first and returns 409 for a finalized idea (plus a try/catch so any unscreened transition degrades to 409, not 500).
- **goals #5 — duplicate goal.** `acceptCandidate` validated existence but not state, so a double-accept created two goals from one candidate (and orphaned the first). The transaction now re-reads and returns the existing goal if already accepted, and runs `BEGIN IMMEDIATE` so concurrent accepts serialize.
- **scan-queue #5 — orphaned compiler.** The build scanner killed only the shell on timeout, leaking the `tsc`/`next` grandchild, and never cleared the timer on normal close. Now spawns detached on POSIX and tree-kills (`taskkill /T /F` on Windows, `process.kill(-pid)` on POSIX), and `clearTimeout`s the timer in close/error.
- **dependencies #5 — lost signal.** `runGate`'s outer catch dropped the gate-specific status, so a security scan that couldn't run looked identical to one that found CVEs. The catch now sets `details.status:'error'` (distinct from `'no_tests'` and a plain `passed:false`).
- **docs #5 — wrong hot paths.** xrayStore per-layer hotPaths took each top edge's *newest* event path (flapping, never the busiest) and disagreed with the correct global block. Now aggregates per-path counts over the layer's events and takes the top 3.

## Verification

| Gate | Before | After Wave 12 |
|---|---|---|
| tsc (source, excl. `.next`) | 0 | **0** |
| vitest | 604/604 | **604/604** green |

## Cumulative status (Waves 1–12)

- **Closed: 16 Critical + 28 High + 7 Medium + cleanup + 3 test waves** (69 fix/cleanup/test commits + 12 wave docs).
- **Test suite: 547/550 (red) → 604/604 green** (+57 net new assertions this run).
- **Live map: 19 → 16 contexts.**
- **Deferred (logged):** remote #1 (auth), scan-queue #3 abort-propagation, taskrunner #3/#4/#2-restart-reaper, orphaned DB tables, moderate context refresh, and the remaining Mediums/Lows that are test-coverage gaps or need schema/strategy decisions (debt #1 orphaned tables, brain #4 DST decay, integrations #4 parser, reflector #5 dedup semantics, remote #5 ping auth, social #4 audit no-path, testing #5 HEAD pre-check, blueprint #3/#4 idea-status state machine).
- **Remaining per INDEX:** ~22 Medium / 2 Low, mostly test-coverage or decision-needed.
</content>
