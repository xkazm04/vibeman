import Database from 'better-sqlite3';

/**
 * PreparedStatementCache
 * 
 * Caches prepared statements to avoid redundant SQL parsing and bytecode compilation.
 * Uses WeakRef and FinalizationRegistry to ensure statements are automatically 
 * removed from the cache if they are garbage collected, preventing memory leaks 
 * in long-running processes.
 */
export class PreparedStatementCache {
  private cache = new Map<string, WeakRef<Database.Statement>>();
  private registry: FinalizationRegistry<string>;

  constructor() {
    this.registry = new FinalizationRegistry((sql: string) => {
      const ref = this.cache.get(sql);
      if (ref && !ref.deref()) {
        this.cache.delete(sql);
      }
    });
  }

  /**
   * Get a cached statement or create a new one using the provided factory.
   * 
   * @param sql The SQL string used as the cache key
   * @param factory Function to create the statement if not cached
   * @returns The prepared statement (cached or fresh)
   */
  get(sql: string, factory: (sql: string) => Database.Statement): Database.Statement {
    const ref = this.cache.get(sql);
    let stmt = ref?.deref();

    if (!stmt) {
      stmt = factory(sql);
      this.cache.set(sql, new WeakRef(stmt));
      this.registry.register(stmt, sql);
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
   * Get the current cache size (includes stale references not yet finalized).
   */
  get size(): number {
    return this.cache.size;
  }
}

/** Global singleton instance for the default database connection */
export const statementCache = new PreparedStatementCache();
