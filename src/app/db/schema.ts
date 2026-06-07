import { getConnection } from './drivers';
import { runMigrations } from './migrations/index';
import { createCoreTables } from './schema.tables';
import { createIndexes } from './schema.indexes';
import { runPostInitHooks } from './schema.postinit';

/**
 * Initialize all database tables
 * Creates tables if they don't exist and runs migrations
 *
 * NOTE: Called once at server boot from src/app/db/init.ts (ensureDbReady),
 * which loads this module via dynamic import so the schema + migrations
 * subtree stays out of every route's static module graph.
 * It uses the driver-agnostic connection interface.
 *
 * Composed from three phases:
 *  1. createCoreTables()  - DDL for all tables
 *  2. createIndexes()     - all secondary indexes (before migrations)
 *  3. runMigrations()     - schema evolution
 *  4. runPostInitHooks()  - orphan process reaping (non-fatal)
 */
export function initializeTables() {
  const db = getConnection();

  createCoreTables(db);

  // Create indexes BEFORE migrations so migration queries can use them
  // (previously indexes were created after migrations, causing slow queries)
  createIndexes(db);

  // Run migrations AFTER indexes exist (migrations may query large tables)
  runMigrations();

  // Reap orphaned CLI processes from previous server instances
  runPostInitHooks();
}
