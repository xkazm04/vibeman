# Database & Schema — bug-hunter + ui-perfectionist scan

> Context: Database & Schema
> Total: 5 findings (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. `runOnce` wraps migrations in a transaction, but migration functions open their own `BEGIN TRANSACTION` — nested-transaction crash

- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: migration-transaction-safety
- **File**: src/app/db/migrations/migration.utils.ts:256-281 (`runOnce`), interacting with the registry call at src/app/db/migrations/index.ts:235 (`once('m080', () => migrate067FixCheckConstraints())`)
- **Scenario**: `runOnce` runs `db.transaction(() => { migrationFn(); recordMigration(...) })`. Migration 067 (`067_fix_check_constraints.ts:33` and `:62`) detects whether a CHECK constraint needs fixing by issuing raw `db.exec('BEGIN TRANSACTION')` … `COMMIT`/`ROLLBACK` itself. On any database whose `directions`/`behavioral_signals` CHECK constraint is stale (i.e. the migration actually has work to do — the exact case it exists for), the inner `BEGIN TRANSACTION` executes while better-sqlite3's outer transaction is already open and SQLite throws *"cannot start a transaction within a transaction."* The error is caught by the helper's broad `catch { return true }`, so the table-rebuild proceeds — but any migration that issues `COMMIT` before throwing would prematurely commit/rollback `runOnce`'s outer transaction, breaking its all-or-nothing guarantee and the atomic `recordMigration` write.
- **Root cause**: `runOnce`'s design assumes migration functions never manage their own transactions; nothing enforces or documents that contract, and at least one registered migration violates it.
- **Impact**: Broken migration atomicity / silent mis-recording on the very databases that need migration 067; future migrations that follow the same self-`BEGIN` pattern will hard-fail and be permanently recorded `status='failed'`, blocking schema evolution.
- **Fix sketch**: Make migration helpers transaction-aware — use SQLite `SAVEPOINT`/`RELEASE` (which nest) instead of `BEGIN`/`COMMIT` for the constraint-probe inserts, OR have `runOnce` detect an already-open transaction and skip its own wrapper. Add an assertion in `runOnce` that the connection is not already in a transaction.

## 2. `buildUpdateStatement` sets `updated_at` twice when callers pass it in `updates`, producing a malformed `SET` clause with mismatched values

- **Severity**: High
- **Lens**: bug-hunter
- **Category**: dynamic-sql-correctness
- **File**: src/app/db/repositories/repository.utils.ts:208-236 (with `buildUpdateQuery` at :160-178)
- **Scenario**: `buildUpdateStatement` calls `buildUpdateQuery(updates, excludeFields)` where `excludeFields` defaults to `['id', 'created_at']` — note `updated_at` is **not** excluded. If a caller passes an `updates` object that includes `updated_at` (a very natural thing to do for a row DTO), `buildUpdateQuery` emits `updated_at = ?` with that value, then line 226 unconditionally appends a *second* `updated_at = ?` with `getCurrentTimestamp()`. The result is `UPDATE t SET …, updated_at = ?, updated_at = ?` and a `values` array whose positional binding is now offset/duplicated. SQLite accepts duplicate assignments (last wins) but the duplicated placeholder shifts every subsequent `?` binding, silently writing the wrong values into the wrong columns.
- **Root cause**: The helper assumes callers never include `updated_at` in `updates`, but the default `excludeFields` doesn't enforce that assumption.
- **Impact**: Silent data corruption (values bound to wrong columns) for any repository that feeds a full row (including `updated_at`) into this helper. Latent today because in-scope callers were removed in the refactor, but it is a live landmine for the next caller.
- **Fix sketch**: Add `'updated_at'` to the default `excludeFields` in `buildUpdateStatement` (and/or strip it inside the helper before re-adding), so the timestamp is managed in exactly one place.

## 3. Migration success is recorded outside the transaction with a swallowed-error `catch`, so a crash/failure there re-runs non-idempotent DDL

- **Severity**: High
- **Lens**: bug-hunter
- **Category**: migration-idempotency
- **File**: src/app/db/migrations/migration.utils.ts:264-280 (`runOnce`) with `recordMigrationSuccess` at :224-228 and `recordMigration` at :205-208
- **Scenario**: Inside the transaction, `recordMigration` runs `INSERT OR IGNORE … VALUES (name, …, 'applied')`. If a prior run left a `status='failed'` row for this `name` (PK conflict), `INSERT OR IGNORE` is a **no-op** — the row stays `'failed'`. The corrective `UPDATE … SET status='applied'` is done by `recordMigrationSuccess`, but that runs *after commit* and is wrapped in `try { … } catch { /* best-effort */ }` (line 272). If that UPDATE throws, or the process dies between commit and the UPDATE, the migration's schema change is committed but the tracking row still reads `status='failed'`. On next boot, `isMigrationApplied` (which excludes failed rows, :195-200) returns false and the migration re-runs — and non-idempotent DDL like `ALTER TABLE … ADD COLUMN` or a `CREATE TABLE x_new` table-rebuild throws "duplicate column"/"table already exists", marking a genuinely-applied migration permanently failed.
- **Root cause**: Split write — the authoritative `status='applied'` flip lives outside the atomic transaction and is treated as best-effort, breaking the "applied iff committed" invariant the function's own comment promises.
- **Impact**: Re-run failures / spurious permanent `failed` state after a retried migration; noisy startup errors and a migration that can never reach `applied`.
- **Fix sketch**: Inside the transaction, replace `INSERT OR IGNORE` with an upsert that forces `status='applied'` and clears `error_message` on conflict (e.g. `ON CONFLICT(name) DO UPDATE SET status='applied', error_message=NULL`). Keep `recordMigrationSuccess` only for the duration metric, not for the status flip.

## 4. JSON column types are declared as `string` everywhere but there is no shared safe-parse path at the read boundary — a malformed JSON column corrupts the read

- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: json-column-parsing
- **File**: src/app/db/models/types.ts (e.g. `file_paths` :143, `entry_points`/`db_tables`/`keywords`/`cross_refs` :158-163, `metadata` :264), src/app/db/models/brain.types.ts:29 (`data`), src/app/db/repositories/repository.utils.ts:253-254
- **Scenario**: Dozens of columns hold JSON-as-TEXT and are typed `string`. The only safe-parse helper the DB layer exposes is `parseJsonArray` (re-exported here as the *deprecated* `safeParseJsonArray`), which is array-only and on failure returns `[]` — silently dropping data rather than surfacing it. There is no object-shaped safe-parse exposed at the repository boundary, so individual callers either `JSON.parse` directly (throws on a truncated/legacy/hand-edited value → 500 on read) or fall back to `[]`/`{}` and silently lose the row's payload. A single bad write (e.g. a non-UTF8 truncation, a pre-migration legacy shape, or a manual DB edit) thus either crashes the read path or silently blanks the field with no log.
- **Root cause**: The schema treats JSON columns as opaque strings and pushes (de)serialization responsibility to ~150 scattered call sites with no enforced, logged, fail-soft parse helper for object columns.
- **Impact**: Either uncaught read-time exceptions (crash) or silent field loss (corruption-on-read) depending on the call site; failures are invisible because the array helper swallows them.
- **Fix sketch**: Provide and standardize on a logged `safeParseJsonObject<T>(str, fallback)` (sibling to `parseJsonArray`) that records a warning + the column/row id on parse failure, and route all repository JSON-column reads through `safeParseJson*`. Deprecate direct `JSON.parse` on DB columns.

## 5. WAL / pragma setup is fire-and-forget — `journal_mode = WAL` and `foreign_keys = ON` failures are never verified, silently degrading durability and FK enforcement

- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: connection-lifecycle
- **File**: src/app/db/drivers/sqlite.driver.ts:99-110
- **Scenario**: `getConnection()` issues `db.pragma('journal_mode = WAL')` and `db.pragma('foreign_keys = ON')` but ignores the return value of every pragma. `journal_mode=WAL` *returns the actual mode applied* and silently stays in `delete`/`memory` mode when the DB file is on a network/virtualized/locked filesystem (a real case on Windows + OneDrive-synced or mapped-drive project paths). Likewise, if `foreign_keys = ON` fails to take effect (e.g. a connection already inside a transaction, or a build of SQLite compiled without FK support), the entire app runs with FK constraints *off* — so every `ON DELETE CASCADE` and FK declared across the schema is silently a no-op, allowing orphaned rows. Nothing logs or checks either outcome, and the health endpoint (src/app/api/health/route.ts:45) only runs `SELECT 1`, so it reports "pass" even when FK enforcement and WAL are both disabled.
- **Root cause**: Pragmas are assumed to always succeed; their return/verification is discarded, and the health check doesn't probe the actual configured state.
- **Impact**: Silent loss of crash-durability (no WAL) and silent loss of referential integrity (FKs off) → orphaned/inconsistent rows that no monitor catches. Hard to diagnose because everything *looks* healthy.
- **Fix sketch**: Read back `db.pragma('journal_mode', { simple: true })` and `db.pragma('foreign_keys', { simple: true })` after setting them; log a warning (or throw in dev) if they don't equal `wal`/`1`. Optionally surface FK/journal state in the health-check `details`.
