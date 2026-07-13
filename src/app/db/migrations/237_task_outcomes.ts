/**
 * Migration 237: Persisted per-task execution outcomes
 *
 * TaskRunner computed the files a task changed (claudeExecutionQueue.getChangedFiles)
 * purely to feed a domain event nobody rendered, and the in-memory queue + terminal
 * run events are garbage-collected minutes after completion — so a completed task
 * showed nothing about what it did, and nothing survived a page reload or server
 * restart. This table persists one durable outcome row per task (its final status,
 * duration, the files it touched, and a short summary) so the post-completion panel
 * can render "what changed" long after the live execution is gone.
 *
 * Keyed by task_id (the stable requirement name): a retry of the same requirement
 * upserts its latest outcome rather than accumulating stale rows.
 */

import type { MigrationLogger } from './migration.utils';

interface MigrationDb {
  prepare: (sql: string) => { run: (...args: unknown[]) => unknown };
  exec: (sql: string) => void;
}

export function migrate237TaskOutcomes(db: MigrationDb, logger: MigrationLogger) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_outcomes (
        task_id TEXT PRIMARY KEY,
        project_id TEXT,
        project_path TEXT,
        requirement_name TEXT NOT NULL,
        status TEXT NOT NULL,
        duration_ms INTEGER,
        changed_files TEXT NOT NULL DEFAULT '[]',
        summary TEXT,
        provider TEXT,
        model TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    logger.info('[Migration 237] Created task_outcomes table');
  } catch {
    logger.info('[Migration 237] task_outcomes table may already exist');
  }

  try {
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_task_outcomes_project ON task_outcomes(project_id)'
    ).run();
  } catch {
    // Index might already exist
  }

  try {
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_task_outcomes_project_path ON task_outcomes(project_path)'
    ).run();
  } catch {
    // Index might already exist
  }

  logger.info('[Migration 237] task outcome persistence migration complete');
}
