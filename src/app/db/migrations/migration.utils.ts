/**
 * Migration Utilities
 * Helper functions to reduce code duplication in database migrations
 */

import { DbConnection } from '../drivers/types';

/** Safe SQL identifier: letters, digits, underscores; must start with letter or underscore */
const SAFE_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertSafeIdentifier(name: string, label: string): void {
  if (!SAFE_IDENTIFIER_RE.test(name)) {
    throw new Error(`${label} contains unsafe characters: "${name}"`);
  }
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | number | null;
  pk: number;
}

export interface MigrationLogger {
  info: (message: string) => void;
  error: (message: string, error?: unknown) => void;
  success: (message: string) => void;
}

/**
 * Get table column information
 */
export function getTableInfo(db: DbConnection, tableName: string): ColumnInfo[] {
  assertSafeIdentifier(tableName, 'tableName');
  return db.prepare(`PRAGMA table_info(${tableName})`).all() as unknown as ColumnInfo[];
}

/**
 * Check if a column exists in a table
 */
export function hasColumn(db: DbConnection, tableName: string, columnName: string): boolean {
  const tableInfo = getTableInfo(db, tableName);
  return tableInfo.some(col => col.name === columnName);
}

/**
 * Add a column to a table if it doesn't already exist
 */
export function addColumnIfNotExists(
  db: DbConnection,
  tableName: string,
  columnName: string,
  columnDefinition: string,
  logger?: MigrationLogger
): boolean {
  assertSafeIdentifier(tableName, 'tableName');
  assertSafeIdentifier(columnName, 'columnName');

  // First check if table exists - if not, skip (table will be created with column by schema)
  if (!tableExists(db, tableName)) {
    logger?.info(`Table ${tableName} does not exist yet, skipping column addition`);
    return false;
  }

  if (hasColumn(db, tableName, columnName)) {
    logger?.info(`Column ${columnName} already exists in ${tableName}`);
    return false;
  }

  logger?.info(`Adding ${columnName} column to ${tableName} table`);
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  return true;
}

/**
 * Add multiple columns to a table
 */
export function addColumnsIfNotExist(
  db: DbConnection,
  tableName: string,
  columns: Array<{ name: string; definition: string }>,
  logger?: MigrationLogger
): number {
  let added = 0;
  for (const col of columns) {
    if (addColumnIfNotExists(db, tableName, col.name, col.definition, logger)) {
      added++;
    }
  }
  return added;
}

/**
 * Check if a table exists
 */
export function tableExists(db: DbConnection, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;

  return !!result;
}

/**
 * Create a table if it doesn't exist
 */
export function createTableIfNotExists(
  db: DbConnection,
  tableName: string,
  createStatement: string,
  logger?: MigrationLogger
): boolean {
  if (tableExists(db, tableName)) {
    logger?.info(`Table ${tableName} already exists`);
    return false;
  }

  logger?.info(`Creating ${tableName} table`);
  db.exec(createStatement);
  return true;
}

/**
 * Safe migration wrapper that catches and logs errors
 * @deprecated Use runOnce() for tracked, transactional migrations instead.
 */
export function safeMigration(
  name: string,
  migrationFn: () => void,
  logger?: MigrationLogger
): void {
  try {
    migrationFn();
  } catch (error) {
    logger?.error(`Error in migration ${name}:`, error);
  }
}

// ── Migration Tracking ─────────────────────────────────────────────────

/**
 * Create the migration tracking table if it doesn't exist
 */
export function ensureMigrationsTable(db: DbConnection): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations_applied (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  // Add affected_tables column for migration timeline visibility
  try {
    const cols = db.prepare(`PRAGMA table_info(_migrations_applied)`).all() as unknown as ColumnInfo[];
    if (!cols.some(c => c.name === 'affected_tables')) {
      db.exec(`ALTER TABLE _migrations_applied ADD COLUMN affected_tables TEXT DEFAULT ''`);
    }
    if (!cols.some(c => c.name === 'status')) {
      db.exec(`ALTER TABLE _migrations_applied ADD COLUMN status TEXT NOT NULL DEFAULT 'applied'`);
    }
    if (!cols.some(c => c.name === 'error_message')) {
      db.exec(`ALTER TABLE _migrations_applied ADD COLUMN error_message TEXT`);
    }
    if (!cols.some(c => c.name === 'duration_ms')) {
      db.exec(`ALTER TABLE _migrations_applied ADD COLUMN duration_ms INTEGER`);
    }
  } catch { /* columns may already exist */ }
}

/**
 * Get all applied migrations ordered by applied_at
 */
export function getAppliedMigrations(db: DbConnection): Array<{
  name: string;
  applied_at: string;
  affected_tables: string;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
}> {
  return db.prepare(`
    SELECT name, applied_at, COALESCE(affected_tables, '') as affected_tables,
           COALESCE(status, 'applied') as status, error_message, duration_ms
    FROM _migrations_applied
    ORDER BY applied_at DESC
  `).all() as Array<{ name: string; applied_at: string; affected_tables: string; status: string; error_message: string | null; duration_ms: number | null }>;
}

/**
 * Check if a migration has already been successfully applied.
 * Failed migrations are NOT considered applied so they will be retried.
 */
export function isMigrationApplied(db: DbConnection, name: string): boolean {
  const row = db.prepare(
    "SELECT 1 FROM _migrations_applied WHERE name = ? AND (status IS NULL OR status = 'applied')"
  ).get(name);
  return !!row;
}

/**
 * Record a migration as applied
 */
export function recordMigration(db: DbConnection, name: string, affectedTables?: string[]): void {
  const tables = affectedTables?.join(',') ?? '';
  // Upsert to 'applied' rather than INSERT OR IGNORE: if a prior run left a
  // status='failed' row for this name, OR IGNORE would no-op and leave it
  // 'failed', so isMigrationApplied() returns false next boot and the migration
  // re-runs — non-idempotent DDL (ADD COLUMN, table rebuild) then hard-fails.
  // This runs inside runOnce()'s transaction, so the 'applied' status commits
  // atomically with the schema change.
  db.prepare(
    `INSERT INTO _migrations_applied (name, affected_tables, status) VALUES (?, ?, 'applied')
     ON CONFLICT(name) DO UPDATE SET status = 'applied', affected_tables = excluded.affected_tables, error_message = NULL`
  ).run(name, tables);
}

/**
 * Record a migration failure (rolled back)
 */
export function recordMigrationFailure(db: DbConnection, name: string, errorMessage: string, durationMs?: number): void {
  db.prepare(
    `INSERT INTO _migrations_applied (name, status, error_message, duration_ms)
     VALUES (?, 'failed', ?, ?)
     ON CONFLICT(name) DO UPDATE SET status = 'failed', error_message = ?, duration_ms = ?, applied_at = datetime('now')`
  ).run(name, errorMessage, durationMs ?? null, errorMessage, durationMs ?? null);
}

/**
 * Record migration success with duration
 */
export function recordMigrationSuccess(db: DbConnection, name: string, durationMs: number): void {
  db.prepare(
    `UPDATE _migrations_applied SET status = 'applied', duration_ms = ?, error_message = NULL WHERE name = ?`
  ).run(durationMs, name);
}

/**
 * Get failed migrations that may need re-running
 */
export function getFailedMigrations(db: DbConnection): Array<{
  name: string;
  applied_at: string;
  error_message: string;
}> {
  return db.prepare(`
    SELECT name, applied_at, COALESCE(error_message, '') as error_message
    FROM _migrations_applied
    WHERE status = 'failed'
    ORDER BY applied_at DESC
  `).all() as Array<{ name: string; applied_at: string; error_message: string }>;
}

/**
 * Run a migration only once — skips if already applied, records on success.
 * Wraps execution + recording in a transaction so a crash between the two
 * cannot leave the migration applied-but-unrecorded (causing re-run failures
 * for non-idempotent DDL like ALTER TABLE ADD COLUMN).
 *
 * On failure the transaction is automatically rolled back by better-sqlite3,
 * leaving the schema untouched. The failure is recorded in `_migrations_applied`
 * with status='failed' so it can be retried on next startup.
 */
export function runOnce(
  db: DbConnection,
  name: string,
  migrationFn: () => void,
  logger?: MigrationLogger
): void {
  if (isMigrationApplied(db, name)) return;

  const start = performance.now();
  try {
    db.transaction(() => {
      migrationFn();
      recordMigration(db, name);
    });
    const durationMs = Math.round(performance.now() - start);
    // Update with duration after successful commit
    try { recordMigrationSuccess(db, name, durationMs); } catch { /* best-effort */ }
    logger?.success(`Migration ${name} applied in ${durationMs}ms`);
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error(`Migration ${name} failed and was rolled back (${durationMs}ms):`, error);
    // Record failure outside the (now-rolled-back) transaction
    try { recordMigrationFailure(db, name, errorMessage, durationMs); } catch { /* best-effort */ }
  }
}
