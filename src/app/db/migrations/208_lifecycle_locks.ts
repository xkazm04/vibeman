/**
 * Migration 208: Lifecycle Locks Table
 *
 * Adds a `lifecycle_locks` table to provide atomic row-level locking
 * for the LifecycleOrchestrator, replacing the non-atomic boolean cycleLock flag.
 * Lock is claimed via UPDATE ... WHERE locked = 0 (same pattern as scan_queue claimNextPending).
 */

import type { DbConnection } from '../drivers/types';
import { createTableIfNotExists, runOnce, type MigrationLogger } from './migration.utils';

export function migrate208LifecycleLocks(db: DbConnection, logger?: MigrationLogger): void {
  runOnce(db, 'm208', () => {
    createTableIfNotExists(db, 'lifecycle_locks', `
      CREATE TABLE IF NOT EXISTS lifecycle_locks (
        project_id TEXT PRIMARY KEY,
        locked     INTEGER NOT NULL DEFAULT 0,
        locked_at  TEXT,
        updated_at TEXT NOT NULL
      )
    `, logger);

    logger?.success('Migration 208: created lifecycle_locks table');
  }, logger);
}
