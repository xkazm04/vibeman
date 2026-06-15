# Database & Schema — Feature + UI Scan
> Context: Database & Schema | Group: Data & Infrastructure
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (4f feature / 1ui ui) | Priority: 1crit/2high/2med/0low
> Files read: ~18

> **Drift notes (verified):** (1) Context `desc` claims "SQLite/PostgreSQL support" but `src/app/db/drivers/types.ts:9` hard-codes `DbDriverType = 'sqlite'` and `index.ts:23` comments "SQLite is the only supported driver" — PostgreSQL never existed. (2) Manifest paths are accurate; no deleted files. (3) The real schema DDL lives in `schema.tables.ts` / `schema.indexes.ts` / `schema.postinit.ts` (not in the manifest but reachable from `schema.ts`); the manifest's `migration.utils.ts` is the migration spine.

## 1. Five migrations exist on disk but were never wired into the runner — 4 live features are silently broken
- **Lens**: 🔍 feature-scout
- **Priority**: critical
- **Category**: functionality
- **File(s)**: src/app/db/migrations/index.ts:88-89 (registry ends at m231; 138/139/140/141/229 absent), src/app/db/migrations/140_file_write_queue.ts:13, src/app/db/migrations/141_triage_rules.ts:10, src/app/db/migrations/139_insight_lineage_table.ts:17, src/app/db/migrations/229_cli_transcript_mirror.ts:20, src/app/db/migrations/138_file_watch_config_unique_project.ts:17
- **Current state**: `runMigrations()` enumerates every migration by hand via `once('mNNN', ...)`. Files `138`, `139`, `140`, `141`, `229` are present on disk and export proper migrate functions, but no `import` and no `once(...)` call references them (grep for `m138|m139|m140|m141|m229|file_write_queue|triage_rules|insight_lineage|cli_transcript` in `index.ts` returns zero matches). None of these tables/columns are created in `schema.tables.ts` either. Yet live code reads/writes them: `file-write-queue.repository.ts:33-120` (`file_write_queue`), `triage-rule.repository.ts`, `brain-insight.repository.ts:99/218/327/830` (`canonical_id`, `insight_lineage`), and `src/lib/claude-terminal/session-store.ts` (`cli_transcript_mirror`). On any fresh DB these throw `no such table` / `no such column: canonical_id` at runtime.
- **Opportunity**: Wire the five orphaned migrations into the `once(...)` registry (m138–m141, m229), in order, after their dependencies (139 alters `brain_insights`; 140 FKs `ideas`).
- **Value**: Restores four shipped-but-dead features — accept-then-write file queue (idea acceptance no longer orphans on FS failure), auto-triage rules, insight dedup/lineage (the "80-90% cache hit" win in 139's header), and crash-safe CLI transcript resume — none of which work today on a clean install.
- **Effort**: 2
- **Implementation sketch**: Add the 5 imports and 5 `once('m138', () => migrate138FileWatchConfigUniqueProject(db as any, migrationLogger))` … `once('m229', () => migrate229CliTranscriptMirror(db as any, migrationLogger))` lines. Note 139 uses an outlier `{ version, up, down }` export — normalize it to the `migrate139(db, logger)` signature first so it matches the runner contract.

## 2. Migrations never persist `affected_tables`, so the Migration Timeline UI and rollback both run on guesswork
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/db/migrations/migration.utils.ts:205-217 (`recordMigration` accepts `affectedTables?` but `runOnce:277` calls it with none), src/app/db/migrations/index.ts:157 (`once` → `runOnce` passes no tables), src/app/api/migrations/route.ts:33-66 (`inferAffectedTables`), src/app/api/migrations/route.ts:73-96 (`generateRollbackDDL`)
- **Current state**: The schema collects `affected_tables`, `status`, `duration_ms` per migration and a `/api/migrations` + `MigrationTimeline.tsx` UI consumes them. But `runOnce` always calls `recordMigration(db, name)` with no table list, so `affected_tables` is permanently empty. The API therefore falls back to `inferAffectedTables` — a hard-coded keyword→table map (`route.ts:35`) that lists tables that don't even match the real whitelist (e.g. `knowledge_base_entries`, `obs_api_calls`, `direction_preferences`, `daily_standups` don't exist in `repository.utils.ts` VALID_TABLE_NAMES). Worse, `generateRollbackDDL` only emits `DROP TABLE`, so rolling back any `ADD COLUMN` migration either no-ops or drops the entire table = data loss.
- **Opportunity**: Have each migration declare the tables it touches and thread that through `once()` → `runOnce()` → `recordMigration()`, then delete the brittle `inferAffectedTables` fallback and make `generateRollbackDDL` refuse (or warn) on column-only migrations.
- **Value**: Turns the migration timeline from decorative into trustworthy, and removes a data-loss footgun from the rollback endpoint — directly serving Vibeman's "autonomous, self-healing schema" direction.
- **Effort**: 3
- **Implementation sketch**: Change `once` to `(name, tables, fn)`; pass `tables` to `runOnce`, which forwards to `recordMigration(db, name, tables)`. In `route.ts`, drop `inferAffectedTables` once `affected_tables` is populated, and in `generateRollbackDDL` mark migrations whose stored tables already existed before the migration as "manual rollback required" instead of emitting `DROP TABLE`.

## 3. `index.ts` is a 4,504-line monolith with three competing migration conventions and triple manual registration
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: maintenance
- **File(s)**: src/app/db/migrations/index.ts:1-342 (registry + 4,500 lines of inline `migrateXxx()` bodies for m001–m089), src/app/db/migrations/index.ts:160-325 (manual `once(...)` calls), src/app/db/migrations/139_insight_lineage_table.ts:17 (`{ version, up, down }` outlier shape)
- **Current state**: Migrations exist in three incompatible forms: (a) inline functions defined directly in `index.ts` for m001–m089 wrapped in deprecated `safeMigration` (no transaction, no failure recording), (b) external `migrateNNN(db, logger)` modules invoked via `once(...)`, and (c) one rogue `export const migration = { version, up, down }` (139). Adding a migration requires editing three spots (import, `once` call, sometimes destructive-list at :133) with no auto-discovery — which is exactly how 138–141/229 got dropped (Finding #1).
- **Opportunity**: Add a single ordered auto-loader that globs `NNN_*.ts`, validates each exports a uniform `migrate(db, logger)` (+ optional `affectedTables`), and runs them through `runOnce` in numeric order; migrate the inline m001–m089 bodies out into files incrementally.
- **Value**: Eliminates the "forgot to register" failure class permanently, shrinks the 4.5k-line file, and gives every migration the transactional `runOnce` safety the legacy `safeMigration` ones lack.
- **Effort**: 4
- **Implementation sketch**: Create `migrations/registry.ts` that imports an ordered array (or uses a build-time glob) of `{ id, affectedTables, run }`; `runMigrations` iterates it. Convert 139 to the standard signature. Keep the existing `_bootstrap` destructive pre-seed logic untouched. Backfill inline functions to files over time.

## 4. Dual, uncoordinated persistence backends — dead "multi-driver" abstraction vs. live Supabase sync
- **Lens**: 🔍 feature-scout
- **Priority**: medium
- **Category**: feature
- **File(s)**: src/app/db/drivers/types.ts:9 (`DbDriverType = 'sqlite'` only), src/app/db/drivers/index.ts:36-41 (`createDriver` throws unless `config.sqlite`), src/app/api/db-sync/sync/route.ts:2-3 (separate Supabase path), src/lib/supabase/sync.ts
- **Current state**: The `DbDriver`/`DbConnection`/`DbStatement` abstraction (`types.ts`) was clearly built for a second backend (the interface even documents "For PostgreSQL, this may be mapped…" at types.ts:30), but only SQLite is ever constructed and the type union forbids anything else. Separately, `/api/db-sync` ships a parallel SQLite→Supabase replication path (`syncAllTables`) that is the *actual* remote-DB story. Two half-overlapping mechanisms with no shared contract.
- **Opportunity**: Either (a) collapse the unused driver-polymorphism (drop the `DbConfig.driver` union, keep the thin `DbConnection` wrapper) to remove dead surface, or (b) if cloud durability is the goal, surface `/api/db-sync` status in the health endpoint and document that Supabase — not a PG driver — is the remote backend.
- **Value**: Removes a misleading "we support Postgres" affordance and clarifies the one real remote-persistence path (Supabase), so contributors stop building toward a driver that will never ship.
- **Effort**: 2
- **Implementation sketch**: Decide direction with the owner. For (a): inline the SQLite driver, delete `DbDriverType` union and `createDriver` branch. For (b): add a `dbSync` check to `/api/health` (`route.ts:127`) calling `getSyncStatus()`, and add a one-line note to `drivers/index.ts` that remote = Supabase sync, not a driver.

## 5. `MigrationTimeline` and `/api/migrations` have no failed-migration call-to-action, and the rollback control is a silent footgun
- **Lens**: 🎨 ui-perfectionist
- **Priority**: medium
- **Category**: ui
- **File(s)**: src/app/features/System/MigrationTimeline.tsx, src/app/api/migrations/route.ts:119-125 (`failed` count returned), src/app/api/migrations/route.ts:135-198 (POST rollback defaults `dryRun=true`)
- **Current state**: The API already returns a `failed` count and per-migration `status`/`error_message` (`route.ts:113-119`), and `getFailedMigrations` surfaces rolled-back DDL failures — but failed migrations are the highest-signal event a developer can see (a feature's table is missing, e.g. Finding #1) and there is no explicit empty/error/failed visual state or "retry on next boot" affordance tied to them. The rollback POST returns DDL but defaults to dry-run with no UI distinction between "DDL previewed" and "actually executed," and a real execution can `DROP TABLE` (data loss).
- **Opportunity**: Add a dedicated failed-migrations banner with the `error_message` and a "these retry automatically on restart" hint, and make the rollback action a two-step confirm that visually separates dry-run preview (safe, default) from destructive execute, showing the exact DDL and a red "this drops tables" warning when `generateRollbackDDL` emits any `DROP`.
- **Value**: Makes silent schema failures (the exact class behind Finding #1) impossible to miss, and prevents an accidental destructive rollback — high-stakes UX for a data/infra surface where a wrong click loses data.
- **Effort**: 2
- **Implementation sketch**: In `MigrationTimeline.tsx`, when `failed > 0` render a top warning card listing failed rows with `error_message`. For rollback, gate the destructive `dryRun:false` call behind a modal that renders the returned `ddl[]`, highlights `DROP TABLE` lines in red, and requires explicit confirm; keep dry-run as the default one-click "preview."
