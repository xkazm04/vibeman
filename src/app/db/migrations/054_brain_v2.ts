/**
 * Migration 054: Brain 2.0 - Behavioral Learning + Autonomous Reflection
 * Creates tables for:
 * - behavioral_signals: Track user behavior (git, API, context focus)
 * - direction_outcomes: Track implementation outcomes
 * - brain_reflections: Track autonomous reflection sessions
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate054BrainV2(db: Database.Database): void {
  let tablesCreated = 0;

  // Create behavioral_signals table
  if (!tableExists(db, 'behavioral_signals')) {
    db.exec(`
      CREATE TABLE behavioral_signals (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        signal_type TEXT NOT NULL CHECK (signal_type IN ('git_activity', 'api_focus', 'context_focus', 'implementation')),
        context_id TEXT,
        context_name TEXT,
        data TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        timestamp TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_behavioral_signals_project_id
        ON behavioral_signals(project_id);
      CREATE INDEX idx_behavioral_signals_type
        ON behavioral_signals(signal_type);
      CREATE INDEX idx_behavioral_signals_timestamp
        ON behavioral_signals(timestamp DESC);
      CREATE INDEX idx_behavioral_signals_context
        ON behavioral_signals(context_id);
    `);
    console.log('[Migration 054] Created behavioral_signals table');
    tablesCreated++;
  }

  // Create direction_outcomes table
  if (!tableExists(db, 'direction_outcomes')) {
    db.exec(`
      CREATE TABLE direction_outcomes (
        id TEXT PRIMARY KEY,
        direction_id TEXT NOT NULL,
        project_id TEXT NOT NULL,

        -- Execution tracking
        execution_started_at TEXT,
        execution_completed_at TEXT,
        execution_success INTEGER,
        execution_error TEXT,

        -- Git tracking
        commit_sha TEXT,
        files_changed TEXT,
        lines_added INTEGER,
        lines_removed INTEGER,

        -- Revert tracking
        was_reverted INTEGER DEFAULT 0,
        revert_detected_at TEXT,
        revert_commit_sha TEXT,

        -- User feedback
        user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),
        user_feedback TEXT,

        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),

        FOREIGN KEY (direction_id) REFERENCES directions(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_direction_outcomes_direction_id
        ON direction_outcomes(direction_id);
      CREATE INDEX idx_direction_outcomes_project_id
        ON direction_outcomes(project_id);
      CREATE INDEX idx_direction_outcomes_success
        ON direction_outcomes(execution_success);
      CREATE INDEX idx_direction_outcomes_reverted
        ON direction_outcomes(was_reverted);
    `);
    console.log('[Migration 054] Created direction_outcomes table');
    tablesCreated++;
  }

  // Create brain_reflections table
  if (!tableExists(db, 'brain_reflections')) {
    db.exec(`
      CREATE TABLE brain_reflections (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
        trigger_type TEXT NOT NULL CHECK (trigger_type IN ('threshold', 'scheduled', 'manual')),

        -- Analysis scope
        directions_analyzed INTEGER DEFAULT 0,
        outcomes_analyzed INTEGER DEFAULT 0,
        signals_analyzed INTEGER DEFAULT 0,

        -- Results
        insights_generated TEXT,
        guide_sections_updated TEXT,
        error_message TEXT,

        -- Timing
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_brain_reflections_project_id
        ON brain_reflections(project_id);
      CREATE INDEX idx_brain_reflections_status
        ON brain_reflections(status);
      CREATE INDEX idx_brain_reflections_created
        ON brain_reflections(created_at DESC);
    `);
    console.log('[Migration 054] Created brain_reflections table');
    tablesCreated++;
  }

  if (tablesCreated > 0) {
    console.log('[Migration 054] Brain 2.0 tables migration complete');
  }
}
