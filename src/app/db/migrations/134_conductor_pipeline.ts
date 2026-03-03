/**
 * Migration 134: Conductor Pipeline Tables
 *
 * Creates tables for the autonomous development pipeline:
 * - conductor_runs: Pipeline execution records
 * - conductor_errors: Classified error patterns
 * - conductor_healing_patches: Self-healing prompt/config patches
 */

import { tableExists, type MigrationLogger } from './migration.utils';

export function migrate134ConductorPipeline(
  db: { exec: (sql: string) => void },
  logger: MigrationLogger
): void {
  // Pipeline runs table
  if (!tableExists(db as any, 'conductor_runs')) {
    db.exec(`
      CREATE TABLE conductor_runs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idle',
        current_stage TEXT,
        cycle INTEGER DEFAULT 1,
        config_snapshot TEXT,
        stages_state TEXT,
        metrics TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE INDEX idx_conductor_runs_project
      ON conductor_runs(project_id, status)
    `);
  }

  // Error classifications table
  if (!tableExists(db as any, 'conductor_errors')) {
    db.exec(`
      CREATE TABLE conductor_errors (
        id TEXT PRIMARY KEY,
        pipeline_run_id TEXT,
        stage TEXT NOT NULL,
        error_type TEXT NOT NULL,
        error_message TEXT,
        task_id TEXT,
        scan_type TEXT,
        occurrence_count INTEGER DEFAULT 1,
        first_seen TEXT,
        last_seen TEXT,
        resolved INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (pipeline_run_id) REFERENCES conductor_runs(id)
      )
    `);

    db.exec(`
      CREATE INDEX idx_conductor_errors_run
      ON conductor_errors(pipeline_run_id, resolved)
    `);
  }

  // Healing patches table
  if (!tableExists(db as any, 'conductor_healing_patches')) {
    db.exec(`
      CREATE TABLE conductor_healing_patches (
        id TEXT PRIMARY KEY,
        pipeline_run_id TEXT,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        original_value TEXT,
        patched_value TEXT NOT NULL,
        reason TEXT,
        error_pattern TEXT,
        applied_at TEXT,
        effectiveness REAL,
        reverted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (pipeline_run_id) REFERENCES conductor_runs(id)
      )
    `);

    db.exec(`
      CREATE INDEX idx_conductor_patches_target
      ON conductor_healing_patches(target_type, target_id, reverted)
    `);
  }

  logger.info('Migration 134: Created conductor pipeline tables');
}
