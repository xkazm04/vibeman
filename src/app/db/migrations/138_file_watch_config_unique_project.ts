/**
 * Migration 138: Add UNIQUE constraint on file_watch_config.project_id
 *
 * Problem:
 * upsertFileWatchConfig uses a check-then-act pattern (SELECT then INSERT/UPDATE)
 * which can produce duplicate rows under concurrent access since project_id
 * has no UNIQUE constraint.
 *
 * Solution:
 * Recreate the table with a UNIQUE constraint on project_id so that
 * INSERT ... ON CONFLICT(project_id) DO UPDATE can be used atomically.
 */

import { safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate138FileWatchConfigUniqueProject(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('fileWatchConfigUniqueProject', () => {
    // Check if the unique index already exists
    const existingIndex = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'index'
         AND name = 'idx_file_watch_config_unique_project_id'`
      )
      .get();

    if (existingIndex) {
      logger?.info?.('file_watch_config unique project_id index already exists');
      return;
    }

    // Remove any duplicate rows first (keep the most recently updated one)
    db.exec(`
      DELETE FROM file_watch_config
      WHERE rowid NOT IN (
        SELECT MAX(rowid)
        FROM file_watch_config
        GROUP BY project_id
      )
    `);

    // Create unique index on project_id
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_file_watch_config_unique_project_id
      ON file_watch_config(project_id)
    `);

    // Drop the old non-unique index since the unique index covers it
    db.exec(`
      DROP INDEX IF EXISTS idx_file_watch_config_project_id
    `);

    logger?.info?.('Added UNIQUE constraint on file_watch_config.project_id');
  }, logger);
}
