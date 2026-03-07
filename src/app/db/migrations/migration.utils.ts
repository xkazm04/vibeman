/**
 * Migration Utilities
 * Helper functions to reduce code duplication in database migrations
 */

import { DbConnection } from '../drivers/types';

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
}

/**
 * Check if a migration has already been applied
 */
export function isMigrationApplied(db: DbConnection, name: string): boolean {
  const row = db.prepare('SELECT 1 FROM _migrations_applied WHERE name = ?').get(name);
  return !!row;
}

/**
 * Record a migration as applied
 */
export function recordMigration(db: DbConnection, name: string): void {
  db.prepare('INSERT OR IGNORE INTO _migrations_applied (name) VALUES (?)').run(name);
}

/**
 * Run a migration only once — skips if already applied, records on success
 */
export function runOnce(
  db: DbConnection,
  name: string,
  migrationFn: () => void,
  logger?: MigrationLogger
): void {
  if (isMigrationApplied(db, name)) return;

  try {
    migrationFn();
    recordMigration(db, name);
  } catch (error) {
    logger?.error(`Error in migration ${name}:`, error);
  }
}
