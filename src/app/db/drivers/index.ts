/**
 * Database Driver Factory
 * Provides a unified interface for database operations with driver selection
 */

import * as path from 'path';
import type { DbDriver, DbConfig, DbConnection } from './types';
import { createSqliteDriver } from './sqlite.driver';

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
      path: process.env.DB_PATH || path.join(process.cwd(), 'database', 'goals.db'),
      walMode: process.env.DB_WAL_MODE !== 'false'
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
 */
export function getDbDriver(): DbDriver {
  if (!driverInstance) {
    const config = loadDbConfig();
    driverInstance = createDriver(config);

    // Initialize tables and run migrations on first access
    try {
      driverInstance.initializeTables();
    } catch (error) {
      // Re-throw error to be handled by caller
      throw new Error(`Failed to initialize database tables: ${error instanceof Error ? error.message : String(error)}`);
    }
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

/**
 * Run database migrations
 * Convenience method that delegates to the driver
 */
export function runMigrations(): void {
  getDbDriver().runMigrations();
}

/**
 * Initialize database tables
 * Convenience method that delegates to the driver
 */
export function initializeTables(): void {
  getDbDriver().initializeTables();
}

// Cleanup handlers for graceful shutdown
if (typeof process !== 'undefined') {
  process.on('exit', closeDatabase);
  process.on('SIGINT', () => {
    closeDatabase();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    closeDatabase();
    process.exit(0);
  });
}
