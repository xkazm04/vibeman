/**
 * Database Driver Factory
 * Provides a unified interface for database operations with driver selection
 */

import type { DbDriver, DbConfig, DbConnection } from './types';
import { createSqliteDriver } from './sqlite.driver';
import { env } from '@/lib/config/envConfig';

// Export all types
export * from './types';

/**
 * Singleton database driver instance
 */
let driverInstance: DbDriver | null = null;

/**
 * Load database configuration
 * Reads from environment variables or uses defaults
 */
function loadDbConfig(): DbConfig {
  // SQLite is the only supported driver
  return {
    driver: 'sqlite',
    sqlite: {
      path: env.dbPath(),
      walMode: env.dbWalMode()
    }
  };
}

/**
 * Create database driver based on configuration
 */
function createDriver(config: DbConfig): DbDriver {
  if (!config.sqlite) {
    throw new Error('SQLite configuration is required');
  }
  return createSqliteDriver(config.sqlite);
}

/**
 * Get or create the database driver instance
 * This is the main entry point for database access
 *
 * NOTE: Schema/migration initialization is NOT performed here — it runs
 * once at server boot via src/instrumentation.ts → ensureDbReady()
 * (see src/app/db/init.ts). Keeping it out of this synchronous path keeps
 * the migrations subtree out of every consumer's static module graph.
 */
export function getDbDriver(): DbDriver {
  if (!driverInstance) {
    const config = loadDbConfig();
    driverInstance = createDriver(config);
  }

  return driverInstance;
}

/**
 * Get database connection
 * Convenience method that returns the connection from the driver
 */
export function getConnection(): DbConnection {
  return getDbDriver().getConnection();
}

/**
 * Close database connection
 * Should be called on app shutdown
 */
export function closeDatabase(): void {
  if (driverInstance) {
    driverInstance.close();
    driverInstance = null;
  }
}

// NOTE: Shutdown handlers are consolidated in src/app/db/init.ts
// to ensure deterministic ordering (stop aggregation worker → close hot DB → close main DB).
// Schema initialization and migrations live in src/app/db/schema.ts and are
// invoked asynchronously from src/app/db/init.ts (ensureDbReady).
