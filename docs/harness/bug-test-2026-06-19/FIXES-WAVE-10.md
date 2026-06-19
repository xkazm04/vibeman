# Bug-Test Fix Wave 10 — Connection test hook + repository CAS suites

> Added a test-only DB-injection hook to the connection module, then used it to seed
> **3 repository CAS suites (+12 assertions)** that exercise the *real* repositories —
> previously untestable because they call `getDatabase()` internally. Locks in three of
> the run's atomic-write fixes at the DB layer. Branch `vibeman/bug-test-fixes-2026-06-19`.

## Commits

| # | Commit | What | Locks in |
|---|---|---|---|
| 1 | `f94bac4d` | `__setTestDatabase` hook in `connection.ts` | (infra) |
| 2 | `cf9fb84d` | `cross-task-cas.test.ts` (4) | manager #3 |
| 3 | `c6e08948` | `group-health-cas.test.ts` (4) | context-mgmt #2 |
| 4 | `6e8b1eef` | `idea-cas.test.ts` (4) | ideas #1 |

## The hook

`getDatabase()` caches `instrumentedDb` and returns it early, with no way to point it at a
throwaway DB — so only functions taking an explicit `db` arg (like `runOnce`) were testable,
not repository methods. `__setTestDatabase(db)` swaps the cached instance (and clears the
prepared-statement cache so a statement bound to a previous DB is never reused), and `null`
restores the normal lazy driver-backed init. No production caller invokes it.

## What's covered (against in-memory `:memory:` DBs)

- **cross-task `completePlan`/`selectPlan` CAS** — `completePlan` completes a `running` plan and a duplicate/late callback does NOT overwrite the first result; no-op on a non-running plan; `selectPlan` writes a selection only on a `completed` plan.
- **group-health `createIfNoActiveScan`** — creates when none active; refuses a second while one is active for the same group (exactly one active row); doesn't block a different group; allows a new scan once the previous is terminal.
- **idea `claimIdeaForAcceptance`** — exactly one claim from a given `fromStatus` wins; a second claim from `pending` loses so the first winner's `requirement_id` stands (no double-accept); non-matching `fromStatus`/unknown id return false.

## Verification

| Gate | Before | After Wave 10 |
|---|---|---|
| tsc (source, excl. `.next`) | 0 | **0** |
| vitest | 585/585 | **597/597** (+12) |

## Cumulative status (Waves 1–10)

- **Closed: 16 Critical + 28 High + 1 Medium + cleanup + 2 test waves** (58 fix/cleanup/test commits + 10 wave docs).
- **Test suite: 547/550 (red) → 597/597 green** (+50 net new assertions this run: 17 pathSecurity, 21 state-machine/migration, 12 repo-CAS).
- **Live map: 19 → 16 contexts.**
- **The connection test hook unblocks future repository suites** (direction claim/pair-accept, scan-queue terminal CAS, etc.) — those are now a mechanical follow-up rather than a blocker.
- **Deferred (logged):** remote #1 (auth), scan-queue #3 abort-propagation, taskrunner #3/#4/#2-restart-reaper, orphaned DB tables, moderate context refresh.
- **Remaining per INDEX:** discrete-bug surface closed; tail is remaining test-coverage gaps + ~28 Medium / 2 Low.
</content>
