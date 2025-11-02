/**
 * Database Driver Factory
 * Provides a unified interface for database operations with driver selection
 */

import * as path from 'path';
import type { DbDriver, DbConfig, DbConnection } from './types';
import { createSqliteDriver } from './sqlite.driver';
import { createPostgresDriver } from './postgresql.driver';

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
  const driver = (process.env.DB_DRIVER as 'sqlite' | 'postgresql') || 'sqlite';

  if (driver === 'postgresql') {
    return {
      driver: 'postgresql',
      postgresql: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'vibeman',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10')
      }
    };
  }

  // Default to SQLite
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
  switch (config.driver) {
    case 'sqlite':
      if (!config.sqlite) {
        throw new Error('SQLite configuration is required when driver is "sqlite"');
      }
      return createSqliteDriver(config.sqlite);

    case 'postgresql':
      if (!config.postgresql) {
        throw new Error('PostgreSQL configuration is required when driver is "postgresql"');
      }
      return createPostgresDriver(config.postgresql);

    default:
      throw new Error(`Unsupported database driver: ${config.driver}`);
  }
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
      console.error('Error initializing database tables:', error);
      throw error;
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
