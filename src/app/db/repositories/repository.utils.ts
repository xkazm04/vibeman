/**
 * Repository Utilities
 * Shared helper functions for repository operations
 */

import type { Database, Statement } from 'better-sqlite3';

/**
 * Build dynamic update query
 * Reduces duplication in repository update methods
 */
export function buildUpdateQuery<T extends Record<string, unknown>>(
  updates: T,
  excludeFields: string[] = ['id', 'created_at']
): { fields: string[]; values: unknown[] } {
  const fields: string[] = [];
  const values: unknown[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (!excludeFields.includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value === undefined ? null : value);
    }
  });

  return { fields, values };
}

/**
 * Execute a single select query and return first result or null
 */
export function selectOne<T>(db: Database, query: string, ...params: unknown[]): T | null {
  const stmt = db.prepare(query);
  const result = stmt.get(...params) as T | undefined;
  return result || null;
}

/**
 * Execute a select query and return all results
 */
export function selectAll<T>(db: Database, query: string, ...params: unknown[]): T[] {
  const stmt = db.prepare(query);
  return stmt.all(...params) as T[];
}

/**
 * Get current ISO timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Build a dynamic update statement
 */
export function buildUpdateStatement(
  db: Database,
  table: string,
  updates: Record<string, unknown>,
  idField: string = 'id',
  excludeFields: string[] = ['id', 'created_at']
): { stmt: Statement; values: unknown[] } | null {
  const { fields, values } = buildUpdateQuery(updates, excludeFields);

  if (fields.length === 0) {
    return null;
  }

  const now = getCurrentTimestamp();
  fields.push('updated_at = ?');
  values.push(now);

  const stmt = db.prepare(`
    UPDATE ${table}
    SET ${fields.join(', ')}
    WHERE ${idField} = ?
  `);

  return { stmt, values };
}

/**
 * Generate a unique ID with prefix
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Error thrown when a required database table does not exist.
 * Repositories throw this so API routes can return a clear 503 message
 * instead of a generic 500 "Failed to ..." response.
 */
export class TableNotFoundError extends Error {
  public readonly table: string;
  public readonly feature: string;

  constructor(table: string, feature: string) {
    super(`Table "${table}" does not exist. The ${feature} feature requires database migrations to be run.`);
    this.name = 'TableNotFoundError';
    this.table = table;
    this.feature = feature;
  }
}

/**
 * Check if an error is a SQLite "no such table" error
 */
export function isTableMissingError(error: unknown): boolean {
  if (error instanceof TableNotFoundError) return true;
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('no such table');
}

/**
 * Extract table name from a SQLite "no such table" error message
 */
function extractTableName(error: Error): string | null {
  const match = error.message.match(/no such table:\s*(\S+)/);
  return match ? match[1] : null;
}

/**
 * Wrap a DB operation to convert "no such table" errors into TableNotFoundError.
 * Use this in repositories to provide clear error messages.
 */
export function withTableCheck<T>(feature: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof Error && error.message.includes('no such table')) {
      const table = extractTableName(error) || 'unknown';
      throw new TableNotFoundError(table, feature);
    }
    throw error;
  }
}
