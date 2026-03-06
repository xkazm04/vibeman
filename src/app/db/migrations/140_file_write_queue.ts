/**
 * Migration 140: File Write Queue table
 *
 * Decouples the tinder/accept DB update from filesystem file writes.
 * Ideas move to 'accepted_pending_file' until the requirement file is
 * confirmed on disk, then transition to 'accepted'. On repeated failure
 * the idea stays visible for retry instead of becoming an orphan.
 */

import { safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate140FileWriteQueue(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('fileWriteQueue', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS file_write_queue (
        id            TEXT PRIMARY KEY,
        idea_id       TEXT NOT NULL,
        project_path  TEXT NOT NULL,
        file_name     TEXT NOT NULL,
        content       TEXT NOT NULL,
        status        TEXT NOT NULL DEFAULT 'pending'
                      CHECK(status IN ('pending', 'writing', 'completed', 'failed')),
        attempts      INTEGER NOT NULL DEFAULT 0,
        max_attempts  INTEGER NOT NULL DEFAULT 5,
        last_error    TEXT,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL,
        FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_file_write_queue_status
      ON file_write_queue(status)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_file_write_queue_idea_id
      ON file_write_queue(idea_id)
    `);

    logger?.info?.('Created file_write_queue table');
  }, logger);
}
