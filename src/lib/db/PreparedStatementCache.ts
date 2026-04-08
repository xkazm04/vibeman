import Database from 'better-sqlite3';

/**
 * PreparedStatementCache
 *
 * Caches prepared statements to avoid redundant SQL parsing and bytecode compilation.
 * Uses a simple Map since better-sqlite3 statements are lightweight objects.
 */
export class PreparedStatementCache {
  private cache = new Map<string, Database.Statement>();

  /**
   * Get a cached statement or create a new one using the provided factory.
   *
   * @param sql The SQL string used as the cache key
   * @param factory Function to create the statement if not cached
   * @returns The prepared statement (cached or fresh)
   */
  get(sql: string, factory: (sql: string) => Database.Statement): Database.Statement {
    let stmt = this.cache.get(sql);

    if (!stmt) {
      stmt = factory(sql);
      this.cache.set(sql, stmt);
    }

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
