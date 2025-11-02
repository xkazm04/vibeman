/**
 * Database Connection Module
 * Provides backward-compatible interface using the new driver abstraction
 *
 * This module maintains the old API for compatibility while delegating
 * to the new driver-based architecture underneath.
 */

import Database from 'better-sqlite3';
import { getConnection as getDriverConnection, closeDatabase as closeDriver } from './drivers';

/**
 * Get or create database connection
 *
 * DEPRECATED: This returns a driver-agnostic connection object.
 * For new code, consider using the driver abstraction directly.
 *
 * @returns Database connection (currently returns better-sqlite3 Database for compatibility)
 */
export function getDatabase(): Database.Database {
  const connection = getDriverConnection();

  // For now, we return the underlying better-sqlite3 instance for compatibility
  // This works because SqliteConnection wraps a Database.Database
  // In the future, repositories should use the DbConnection interface instead
  return (connection as any).db || connection;
}

/**
 * Close database connection
 * Should be called on app shutdown
 */
export function closeDatabase(): void {
  closeDriver();
}

// Cleanup handlers are now managed in drivers/index.ts
// This module just provides backward compatibility
