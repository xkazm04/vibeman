# Database & Schema — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495759693_2mkovdt
> Group: Data & Infrastructure
> Files read: ~14
> Total: 5 (Critical: 2, High: 2, Medium: 1, Low: 0)

## 1. safeMigration swallows DDL errors inside runOnce → broken migration recorded as "applied" forever
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: migration / silent-failure (success theater)
- **File**: src/app/db/migrations/migration.utils.ts:130-140 (safeMigration) interacting with :265-290 (runOnce); used by ~108 migration bodies, e.g. src/app/db/migrations/index.ts:166 (`once('m001', migrateScansTokenColumns)`) → index.ts:359-371.
- **Scenario**: An `ALTER TABLE ... ADD COLUMN` (or table create) in a migration body throws (e.g. transient lock, schema drift, bad SQL on one user's DB). The body is wrapped in `safeMigration`, which `try/catch`es and only *logs* the error, returning normally. `runOnce` sees no throw from `migrationFn()`, so its transaction commits `recordMigration(name)` with status='applied'. `isMigrationApplied` now returns true on every future boot, so the failed migration **never retries** and the column/table is permanently missing.
- **Root cause**: Two error-handling layers with opposite contracts were nested. `runOnce` was designed to roll back + record 'failed' on throw; `safeMigration` (explicitly `@deprecated`) defeats it by absorbing the throw before it reaches `runOnce`.
- **Impact**: Silent schema corruption: downstream repository reads/writes hit "no such column" / "no such table" with no migration-failure trail; data writes to the missing column are lost. Affects the majority of the migration suite since `safeMigration` wraps most bodies.
- **Fix sketch**: Delete `safeMigration` (or make it re-throw) and let `runOnce` own all error handling; the ~108 call sites should pass the raw body so a real failure records status='failed' and retries next boot.
- **Value**: effort 6 / impact 9 / risk 5

## 2. Supabase sync does clear-then-insert with no transaction → partial-failure data loss on remote mirror
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: data-loss / non-atomic destructive write
- **File**: src/lib/supabase/sync.ts:196-203 (syncTableData), 118-130 (clearSupabaseTable), 135-158 (insertRecordsInBatches)
- **Scenario**: `syncTable` calls `clearSupabaseTable` (DELETE all rows) and *then* `insertRecordsInBatches`. If any batch insert fails (network blip, constraint, type mismatch, mid-stream timeout — the route even sets `maxDuration=300`), the error throws *after* the table was already wiped. The Supabase table is left **empty or partially populated** with no rollback. With `stopOnError=false` (the default) the run still reports per-table failure but the remote data is already gone.
- **Root cause**: Assumes the Supabase REST client gives transactional clear+reinsert; it does not. Each `.delete()` / `.insert()` is an independent autocommitted PostgREST call.
- **Impact**: A flaky sync truncates the production mirror. Anything reading from Supabase (dashboards, pulled state) sees an empty/half table until a later full successful sync.
- **Fix sketch**: Upsert by primary key (onConflict) instead of delete-then-insert, deleting only stale keys after a successful insert; or wrap clear+insert in a server-side RPC/transaction. At minimum, insert into a temp table and swap.
- **Value**: effort 5 / impact 8 / risk 5

## 3. No tests for migration.utils runOnce/recordMigration state machine (applied/failed/retry, idempotency, rollback)
- **Severity**: High
- **Lens**: test-mastery
- **Category**: untested business-critical path (blast radius = whole DB)
- **File**: src/app/db/migrations/migration.utils.ts (runOnce :265, recordMigration :205, recordMigrationFailure :222, isMigrationApplied :195); only existing migration test is tests/unit/migration-integration.test.ts (covers migrations 135/137 only).
- **Scenario**: The status state machine has subtle invariants (failed row must NOT count as applied so it retries; a re-run after failure must `ON CONFLICT DO UPDATE` to 'applied', not no-op; runOnce must roll back DDL on throw and record 'failed'). None of these branches has a single assertion. The Finding #1 nesting bug would have been caught by a "migration body throws → runOnce records 'failed' and re-runs next call" test.
- **Root cause**: Tests exist only for two concrete migrations, not for the shared runner that gates every migration. Risk lives in the runner, one layer above where tests stop.
- **Impact**: Regressions in the apply/retry/rollback logic ship undetected, silently breaking schema evolution for all users.
- **Fix sketch**: Add `migration.utils.test.ts` (in-memory better-sqlite3) asserting: runOnce records 'applied' on success and is skipped on re-run; a throwing body rolls back DDL AND records 'failed' AND re-runs on next call; recordMigration upserts a prior 'failed' row to 'applied'.
- **Value**: effort 3 / impact 8 / risk 2

## 4. No tests for repository.utils query builders (buildUpdateStatement whitelist, identifier guard, updated_at de-dup)
- **Severity**: High
- **Lens**: test-mastery
- **Category**: untested injection-defense / query-builder invariant
- **File**: src/app/db/repositories/repository.utils.ts: buildUpdateStatement :198, buildUpdateQuery :150, validateScore :266, escapeLikePattern :247
- **Scenario**: `buildUpdateStatement` is the SQL-injection boundary for all dynamic UPDATEs (table whitelist at :205, identifier regex at :159, updated_at double-SET prevention at :213-225). A refactor that loosens the regex, drops a table from the whitelist, or re-introduces the duplicate `updated_at = ?` bug would pass CI silently. There is zero test coverage for any of these guards.
- **Root cause**: Security/correctness invariants are enforced only by inline code with explanatory comments, not by executable assertions.
- **Impact**: A regression could re-open SQL injection via column names, or silently corrupt the `updated_at` semantics across every repository update.
- **Fix sketch**: Add `repository.utils.test.ts`: malicious column name throws; unknown table throws; caller-supplied `updated_at` is excluded yet stamped exactly once; `escapeLikePattern` escapes `% _ \`; `validateScore` clamps to [1,10] / null.
- **Value**: effort 2 / impact 7 / risk 2

## 5. WAL/foreign_keys pragma failures only warn — FK cascades silently off, durability silently reduced
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: silent failure / data-integrity (orphan accumulation)
- **File**: src/app/db/drivers/sqlite.driver.ts:102-118
- **Scenario**: On a network/mapped/OneDrive-synced path (common on Windows, which this repo targets), `journal_mode=WAL` can silently stay `delete`, and `foreign_keys=ON` can fail to take effect. The driver *detects* both (good) but only `console.warn`s and proceeds. With FKs off, every `ON DELETE CASCADE` is a no-op, so deleting a parent leaves orphaned child rows accumulating indefinitely; with WAL off, crash durability drops — both invisibly.
- **Root cause**: Treats pragma enforcement as best-effort/observability rather than a correctness precondition; the warning assumes a human is reading server logs.
- **Impact**: Data integrity (orphan rows, broken cascades) degrades silently on a class of real deployment paths with no surfaced signal beyond a log line.
- **Fix sketch**: Surface the failure to the health endpoint (or throw in non-dev) when `foreign_keys` ≠ 1; at minimum record a structured health/degraded flag so /api/health reports it instead of only logging.
- **Value**: effort 3 / impact 6 / risk 4
