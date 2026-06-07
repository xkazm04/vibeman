import Database from 'better-sqlite3';

/**
 * PreparedStatementCache
 *
 * Caches prepared statements to avoid redundant SQL parsing and bytecode
 * compilation, with LRU eviction so the cache cannot grow unbounded across
 * a long-lived server process (every unique SQL string — including ones
 * built with varying IN-list arity — used to live here forever).
 */
export class PreparedStatementCache {
  private cache = new Map<string, Database.Statement>();

  constructor(private readonly maxSize = 500) {}

  /**
   * Get a cached statement or create a new one using the provided factory.
   * Refreshes recency on hit; evicts the least-recently-used statement
   * when the cache is full.
   *
   * @param sql The SQL string used as the cache key
   * @param factory Function to create the statement if not cached
   * @returns The prepared statement (cached or fresh)
   */
  get(sql: string, factory: (sql: string) => Database.Statement): Database.Statement {
    let stmt = this.cache.get(sql);

    if (stmt) {
      // Map iteration order is insertion order — re-insert to mark as
      // most-recently-used.
      this.cache.delete(sql);
      this.cache.set(sql, stmt);
      return stmt;
    }

    stmt = factory(sql);

    if (this.cache.size >= this.maxSize) {
      // Evict the least-recently-used entry (first key in insertion order).
      // better-sqlite3 statements need no explicit teardown — dropping the
      // reference is enough.
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(sql, stmt);
    return stmt;
  }

  /**
   * Clear all cached statements.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current cache size.
   */
  get size(): number {
    return this.cache.size;
  }
}

/** Global singleton instance for the default database connection */
export const statementCache = new PreparedStatementCache();
