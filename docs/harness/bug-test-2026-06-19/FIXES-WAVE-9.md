# Bug-Test Fix Wave 9 — Test coverage (highest-blast paths)

> 3 new vitest suites (**+21 assertions**) seeding coverage on the highest-blast
> untested paths — chosen to also lock in this run's most important fixes so a
> regression fails CI. Branch `vibeman/bug-test-fixes-2026-06-19`.

## Commits

| # | Commit | Suite | Locks in |
|---|---|---|---|
| 1 | `d90872b7` | `migration-runonce.test.ts` (6) | database #1 critical, #3 |
| 2 | `31214823` | `state-machine.test.ts` (9) | manager #1, #2 (W1/W6) |
| 3 | `0e10fd48` | `idea-state-machine.test.ts` (6) | ideas #1, #2 |

## What's covered

- **Migration runOnce / safeMigration (DB-backed, `:memory:`).** Success → `applied` + runs once; a throwing migration rolls back + records `failed` (retryable); a DDL that throws is rolled back; **the critical guard** — `safeMigration` wrapping a throw *inside* `runOnce` re-throws so the migration records `failed` not `applied` (the silent schema-corruption bug); a bare `safeMigration` still swallows (boot resilience). Bridges the `DbConnection.transaction`-executes-immediately contract with a thin adapter (raw better-sqlite3 transactions are deferred).
- **Direction/goal state machine (pure).** `pending→processing`/`processing→accepted` valid, `pending→accepted` INVALID (why manager #1 claims first), `accepted`/`rejected` terminal (why manager #2's second concurrent accept throws on `rejected→accepted`), same-status no-op, `InvalidTransitionError` shape; goal lifecycle + `isValidDirectionStatus`.
- **IdeaStateMachine.authorize (pure).** `pending→accepted` allowed with **no side-effects** and `accepted→accepted` an allowed **no-op** (exactly why ideas #1 needs a server-side CAS, not the state machine, to stop a double-accept); `implemented→accepted`/`implemented→rejected` INVALID (why ideas #2's bulk approve must tolerate a bad id); reject side-effect, `implemented_at` stamp, re-open paths, denial reasons.

## Why these three

They are the **highest-blast untested paths that this run touched**: the migration state machine underpins all persistence (and hides a critical), and the two state machines gate every direction/idea status change (the accept/reject/CAS fixes in W1, W6, and the ideas waves all assume their exact transition tables). Repository-method CAS suites (idea-accept, cross-task, group-health) need a `getDatabase()` test hook the connection module doesn't expose yet — deferred rather than mock-heavy.

## Verification

| Gate | Before | After Wave 9 |
|---|---|---|
| tsc (source, excl. `.next`) | 0 | **0** |
| vitest | 564/564 | **585/585** (+21) |

## Cumulative status (Waves 1–9)

- **Closed: 16 Critical + 28 High + 1 Medium + cleanup + test coverage** (53 fix/cleanup/test commits + 9 wave docs).
- **Test suite: 547/550 (red) → 585/585 green** (+38 net new assertions this run: 17 pathSecurity in W5, 21 here).
- **Live map: 19 → 16 contexts.**
- **Deferred (logged):** remote #1 (auth), scan-queue #3 abort-propagation, taskrunner #3 abort-reconcile (FE) / #4 global backoff / #2 restart-reaper, orphaned DB tables, moderate context refresh, repo-method CAS test suites (need a connection test hook).
- **Remaining per INDEX:** the discrete-bug surface is closed; the tail is test-coverage gaps + ~28 Medium / 2 Low.
</content>
