/**
 * Migration 234: Per-file content-hash baseline for context freshness
 *
 * Stores the sha256 of each context file as-of when the context metadata was
 * last written ("the code the context reflects"). The on-demand audit compares
 * the current on-disk hash against this baseline to detect a context whose
 * mapped files changed since its metadata was generated (content drift) —
 * distinct from a file being deleted (existence drift, already handled).
 *
 * Ports the Personas dev_context_file_hashes cache. Content-hash freshness, not
 * a wall-clock timestamp.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate234ContextFileHashes(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS context_file_hashes (
        project_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        size INTEGER,
        captured_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (project_id, file_path)
      )
    `);
    logger.info('[Migration 234] Created context_file_hashes table');
  } catch {
    logger.info('[Migration 234] context_file_hashes table may already exist');
  }

  try {
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_context_file_hashes_project ON context_file_hashes(project_id)'
    ).run();
  } catch {
    // Index might already exist
  }

  logger.info('[Migration 234] context file-hash baseline migration complete');
}
