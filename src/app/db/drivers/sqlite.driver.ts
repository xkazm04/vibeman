/**
 * SQLite Database Driver
 * Implements the DbDriver interface for SQLite using better-sqlite3
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import type {
  DbDriver,
  DbConnection,
  DbStatement,
  DbRunResult,
  DbDriverType,
  SqliteConfig
} from './types';
import { runMigrations } from '../migrations/index';
import { initializeTables } from '../schema';

/**
 * SQLite connection wrapper
 * Wraps better-sqlite3 Database to match DbConnection interface
 */
class SqliteConnection implements DbConnection {
  constructor(private db: Database.Database) {}

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare<T = Record<string, unknown>>(sql: string): DbStatement<T> {
    const stmt = this.db.prepare(sql);
    return new SqliteStatement<T>(stmt);
  }

  pragma(pragma: string, options?: { simple?: boolean }): Record<string, unknown> | string | number | boolean {
    return this.db.pragma(pragma, options) as Record<string, unknown> | string | number | boolean;
  }

  close(): void {
    this.db.close();
  }

  transaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn);
    return transaction();
  }
}

/**
 * SQLite statement wrapper
 * Wraps better-sqlite3 Statement to match DbStatement interface
 */
class SqliteStatement<T = Record<string, unknown>> implements DbStatement<T> {
  constructor(private stmt: Database.Statement) {}

  get(...params: Array<string | number | boolean | null>): T | undefined {
    return this.stmt.get(...params) as T | undefined;
  }

  all(...params: Array<string | number | boolean | null>): T[] {
    return this.stmt.all(...params) as T[];
  }

  run(...params: Array<string | number | boolean | null>): DbRunResult {
    const result = this.stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid
    };
  }

  iterate(...params: Array<string | number | boolean | null>): IterableIterator<T> {
    return this.stmt.iterate(...params) as IterableIterator<T>;
  }
}

/**
 * SQLite database driver implementation
 */
export class SqliteDriver implements DbDriver {
  private connection: SqliteConnection | null = null;
  private config: SqliteConfig;

  constructor(config: SqliteConfig) {
    this.config = config;
  }

  getConnection(): DbConnection {
    if (!this.connection) {
      // Ensure database directory exists
      const dbDir = path.dirname(this.config.path);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Create database connection
      const db = new Database(this.config.path);

      // Enable WAL mode for better concurrent access
      if (this.config.walMode !== false) {
        db.pragma('journal_mode = WAL');
      }

      this.connection = new SqliteConnection(db);
    }

    return this.connection;
  }

  close(): void {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }

  runMigrations(): void {
    // Run the existing migrations function
    runMigrations();
  }

  initializeTables(): void {
    // Run the existing schema initialization function
    initializeTables();
  }

  getDriverType(): DbDriverType {
    return 'sqlite';
  }
}

/**
 * Create a SQLite driver instance
 */
export function createSqliteDriver(config: SqliteConfig): DbDriver {
  return new SqliteDriver(config);
}
