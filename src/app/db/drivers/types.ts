/**
 * Database Driver Types
 * Defines the interface for database drivers
 */

/**
 * Database driver type
 */
export type DbDriverType = 'sqlite';

/**
 * Generic database connection interface
 * Abstracts away driver-specific implementation details
 */
export interface DbConnection {
  /**
   * Execute a SQL statement without returning results
   * Used for DDL statements (CREATE, ALTER, DROP) and DML statements (INSERT, UPDATE, DELETE)
   */
  exec(sql: string): void;

  /**
   * Prepare a SQL statement for execution
   * Returns a prepared statement that can be executed multiple times
   */
  prepare<T = Record<string, unknown>>(sql: string): DbStatement<T>;

  /**
   * Execute a pragma statement (SQLite-specific)
   * For PostgreSQL, this may be mapped to equivalent configuration commands
   */
  pragma(pragma: string, options?: { simple?: boolean }): Record<string, unknown> | string | number | boolean;

  /**
   * Close the database connection
   */
  close(): void;

  /**
   * Begin a transaction
   */
  transaction<T>(fn: () => T): T;
}

/**
 * Prepared statement interface
 */
export interface DbStatement<T = Record<string, unknown>> {
  /**
   * Execute the statement and return a single row
   */
  get(...params: Array<string | number | boolean | null>): T | undefined;

  /**
   * Execute the statement and return all rows
   */
  all(...params: Array<string | number | boolean | null>): T[];

  /**
   * Execute the statement without returning results
   * Returns information about the execution (e.g., changes count, last insert ID)
   */
  run(...params: Array<string | number | boolean | null>): DbRunResult;

  /**
   * Create an iterator for the statement results
   */
  iterate(...params: Array<string | number | boolean | null>): IterableIterator<T>;
}

/**
 * Result of a run operation
 */
export interface DbRunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

/**
 * Database driver interface
 * Each driver implementation must implement this interface
 */
export interface DbDriver {
  /**
   * Get or create a database connection
   */
  getConnection(): DbConnection;

  /**
   * Close the database connection
   */
  close(): void;

  /**
   * Run all database migrations
   */
  runMigrations(): void;

  /**
   * Initialize database tables
   */
  initializeTables(): void;

  /**
   * Get the driver type
   */
  getDriverType(): DbDriverType;
}

/**
 * Database configuration
 */
export interface DbConfig {
  driver: DbDriverType;
  sqlite?: SqliteConfig;
}

/**
 * SQLite configuration
 */
export interface SqliteConfig {
  path: string;
  walMode?: boolean;
}
