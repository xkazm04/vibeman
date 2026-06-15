# Bug-UX Scan — Fix Wave 4 — DB integrity foundation

> 4 commits, 5 findings closed. 1 finding (context #3) deferred — its file is in the user's WIP.
> Branch: `vibeman/bug-ux-fixes`. Baseline preserved: tsc 0 → 0; tests 539/542 (same 3 deleted-Brain failures).
> Mental model: the data layer every feature passes through must not silently corrupt, crash, or lie about health.

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `a5fee61b` | database #1 — nested-transaction migration crash | Critical | `migrations/067_fix_check_constraints.ts` |
| 2 | `50c89f9c` | database #3 — migration re-run after failed row | High | `migrations/migration.utils.ts` |
| 3 | `f07fb684` | database #2 + #4 — double-`updated_at` & JSON safe-parse | High + Medium | `repositories/repository.utils.ts`, `lib/json-utils.ts` |
| 4 | `84ca5902` | database #5 — pragmas unverified | Medium | `drivers/sqlite.driver.ts` |

## What was fixed

1. **Migration 067 no longer crashes on the DBs that need it.** Its CHECK-constraint probes used raw `BEGIN TRANSACTION`/`COMMIT`/`ROLLBACK`. Inside `runOnce()`'s migration transaction (same connection), the nested `BEGIN` throws *"cannot start a transaction within a transaction."* Both probes now use `SAVEPOINT`/`RELEASE`/`ROLLBACK TO`, which nest inside an enclosing transaction and auto-wrap when standalone — preserving the insert-and-rollback probe semantics either way.
2. **A failed migration row no longer forces a non-idempotent re-run.** `recordMigration` used `INSERT OR IGNORE`, a no-op when a `status='failed'` row already exists, leaving it `failed`; `isMigrationApplied` then returns false next boot and the migration re-runs, so `ADD COLUMN` / table-rebuild DDL hard-fails permanently. It now upserts to `applied` via `ON CONFLICT`, inside the transaction, so the status commits atomically with the schema change.
3. **`buildUpdateStatement` stamps `updated_at` exactly once.** It excluded only `id`/`created_at`, so a caller passing `updated_at` in `updates` produced a duplicated `updated_at = ?` SET assignment that silently overrode the intended `now` stamp. It now force-excludes `updated_at` from the dynamic fields regardless of the caller's `excludeFields`.
4. **A shared, logging, object-shaped JSON safe-parse exists at the repository boundary.** Only the array-only `parseJsonArray` (silent `[]` on failure) was exposed. Added `safeParseJsonObject` (logs on malformed non-empty input) to `json-utils` and re-exported `safeParseJson`/`safeParseJsonObject` from `repository.utils`, so column reads have a non-throwing, non-silent option instead of raw `JSON.parse` (crash) or a blank `{}` (silent loss). *(Adoption across existing call sites is a follow-up; the path now exists.)*
5. **WAL and FK pragmas are verified, not assumed.** `getConnection` issued `journal_mode=WAL` and `foreign_keys=ON` but ignored their results. WAL silently stays `delete`/`memory` on a network/locked filesystem (OneDrive-synced / mapped-drive paths on Windows), and a failed `foreign_keys` makes every `ON DELETE CASCADE`/FK a no-op. Both are now read back and a warning is logged when they didn't apply.

## Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | 0 errors (unchanged) |
| Tests | 539/542 (same 3 deleted-Brain import failures; no regression) |
| ESLint (changed files) | 0 errors (console.warn permitted in driver/lib layers) |
| WIP safety | working tree back to 708; only my 5 files touched |

## Patterns established (catalogue items 11–13)

11. **Use SAVEPOINT, never raw BEGIN, for nestable probes/sub-units.** Any helper that opens its own transaction can be called from inside another transaction (a migration runner, a batch op). `SAVEPOINT name` / `RELEASE name` / `ROLLBACK TO name` works in both contexts; `BEGIN TRANSACTION` throws when nested. (database #1)
12. **Migration success tracking must commit in the same transaction as the schema change, and be a forced upsert.** `INSERT OR IGNORE` silently preserves a prior `failed` row; a post-commit "fix it up" UPDATE can be lost to a crash. Upsert the status to `applied` inside the txn. (database #3)
13. **Don't fire-and-forget a pragma whose effect is observable.** `journal_mode` returns the applied mode and `foreign_keys` is queryable — read them back and warn, or the app runs with degraded durability/integrity while a `SELECT 1` health check still says "pass." (database #5)

## Deferred (WIP overlap)

- **context #3 (`batchMoveContexts` CASE-without-ELSE NULLs group_id).** Its file `src/app/db/repositories/context.repository.ts` is part of the uncommitted `headless-slim` refactor. Pick up once that file is committed/stashed (joins taskrunner #2 & #4 in the WIP-blocked bucket).

## What remains (per INDEX)

Wave 5 — computed-data correctness (5). Wave 6 — UI dead actions / mock data (6). Wave 7 — polish (7). Plus the WIP-blocked bucket (context #3, taskrunner #2/#4) and the remote auth/ownership design (remote #1/#2).
