# Bug-Test Fix Wave 11 — More repository CAS suites

> Used the W10 connection hook to seed **2 more repository CAS suites (+7 assertions)**
> over the remaining atomic-write fixes — directions (claim + paired-accept) and the
> scan-queue terminal-status CAS. Branch `vibeman/bug-test-fixes-2026-06-19`.

## Commits

| # | Commit | Suite | Locks in |
|---|---|---|---|
| 1 | `9a1ab241` | `direction-cas.test.ts` (4) | manager #1, #2 |
| 2 | `c3e97902` | `scan-queue-cas.test.ts` (3) | scan-queue #3 |

## What's covered (real repositories, in-memory DB via `__setTestDatabase`)

- **`claimDirectionForProcessing`** (manager #1) — atomic `pending→processing`; only the first claim wins; a non-pending direction can't be claimed.
- **`acceptPairedDirection`** (manager #2) — accepts one variant and rejects its partner (exactly one accepted); a second accept of the now-rejected partner **throws** on the terminal `rejected→accepted` transition, preserving the pair invariant. (Runs the real `BEGIN IMMEDIATE` transaction against the test DB.)
- **`updateStatus` CAS** (scan-queue #3) — unconditional update with no precondition; completes a `running` item when expecting `running`; and does **not** clobber a `cancelled` item when the worker's terminal write expects `running` (returns null, cancel preserved) — for both the completed and failed paths.

## Verification

| Gate | Before | After Wave 11 |
|---|---|---|
| tsc (source, excl. `.next`) | 0 | **0** |
| vitest | 597/597 | **604/604** (+7) |

## Cumulative status (Waves 1–11)

- **Closed: 16 Critical + 28 High + 1 Medium + cleanup + 3 test waves** (61 fix/cleanup/test commits + 11 wave docs).
- **Test suite: 547/550 (red) → 604/604 green** (+57 net new assertions this run).
- **Regression-guarded fixes now span:** migration `runOnce` (W1 critical), direction/goal + idea state machines, and **five repository CAS paths** — cross-task complete/select, group-health create, idea accept, direction claim + paired-accept, and scan-queue terminal status. Every atomic-write fix from this remediation now has a test that fails if the guard is removed.
- **Live map: 19 → 16 contexts.**
- **Deferred (logged):** remote #1 (auth), scan-queue #3 abort-propagation, taskrunner #3/#4/#2-restart-reaper, orphaned DB tables, moderate context refresh.
- **Remaining per INDEX:** discrete-bug surface closed; tail is lower-value test gaps + ~28 Medium / 2 Low.
</content>
