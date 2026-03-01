/**
 * Migration 130: Align Scoring Constraints to 1-10 Scale
 *
 * Updates remaining tables that still have 1-3 CHECK constraints for
 * effort/impact columns to use the 1-10 scale that matches the ideas table
 * and AI system expectations.
 *
 * Tables affected:
 * - idea_execution_outcomes: predicted_effort, predicted_impact, actual_effort, actual_impact
 * - developer_decisions: effort, impact
 */

import { getConnection } from '../drivers';
import { tableExists, type MigrationLogger } from './migration.utils';

export function migrate130AlignScoringConstraints(db: ReturnType<typeof getConnection>, logger: MigrationLogger): void {
  // Fix idea_execution_outcomes table
  if (tableExists(db, 'idea_execution_outcomes')) {
    try {
      // Test if constraint is already 1-10 by inserting a value of 5
      db.exec('BEGIN TRANSACTION');
      try {
        db.prepare(`
          INSERT INTO idea_execution_outcomes (id, idea_id, project_id, predicted_effort, category, scan_type, executed_at, success)
          VALUES ('__test_130__', '__test__', '__test__', 5, '__test__', '__test__', datetime('now'), 0)
        `).run();
        db.prepare(`DELETE FROM idea_execution_outcomes WHERE id = '__test_130__'`).run();
        db.exec('COMMIT');
        logger.info('idea_execution_outcomes already supports 1-10 scale');
      } catch (e: unknown) {
        db.exec('ROLLBACK');
        const error = e as Error;
        if (error.message?.includes('CHECK constraint')) {
          logger.info('Updating idea_execution_outcomes CHECK constraints to 1-10 scale...');

          db.exec(`
            CREATE TABLE idea_execution_outcomes_new (
              id TEXT PRIMARY KEY,
              idea_id TEXT NOT NULL,
              project_id TEXT NOT NULL,
              predicted_effort INTEGER CHECK (predicted_effort IS NULL OR (predicted_effort >= 1 AND predicted_effort <= 10)),
              predicted_impact INTEGER CHECK (predicted_impact IS NULL OR (predicted_impact >= 1 AND predicted_impact <= 10)),
              actual_effort INTEGER CHECK (actual_effort IS NULL OR (actual_effort >= 1 AND actual_effort <= 10)),
              actual_impact INTEGER CHECK (actual_impact IS NULL OR (actual_impact >= 1 AND actual_impact <= 10)),
              execution_time_ms INTEGER,
              files_changed INTEGER,
              lines_added INTEGER,
              lines_removed INTEGER,
              success INTEGER NOT NULL DEFAULT 0,
              error_type TEXT,
              user_feedback_score INTEGER CHECK (user_feedback_score IS NULL OR (user_feedback_score >= 1 AND user_feedback_score <= 5)),
              category TEXT NOT NULL,
              scan_type TEXT NOT NULL,
              executed_at TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
            );

            INSERT INTO idea_execution_outcomes_new SELECT * FROM idea_execution_outcomes;

            DROP TABLE idea_execution_outcomes;

            ALTER TABLE idea_execution_outcomes_new RENAME TO idea_execution_outcomes;

            CREATE INDEX IF NOT EXISTS idx_execution_outcomes_idea_id ON idea_execution_outcomes(idea_id);
            CREATE INDEX IF NOT EXISTS idx_execution_outcomes_project_id ON idea_execution_outcomes(project_id);
            CREATE INDEX IF NOT EXISTS idx_execution_outcomes_category ON idea_execution_outcomes(project_id, category);
            CREATE INDEX IF NOT EXISTS idx_execution_outcomes_scan_type ON idea_execution_outcomes(project_id, scan_type);
            CREATE INDEX IF NOT EXISTS idx_execution_outcomes_executed_at ON idea_execution_outcomes(project_id, executed_at DESC);
            CREATE INDEX IF NOT EXISTS idx_execution_outcomes_success ON idea_execution_outcomes(project_id, success);
          `);

          logger.success('idea_execution_outcomes constraints updated to 1-10 scale');
        } else {
          throw e;
        }
      }
    } catch (outerError) {
      logger.error('Failed to migrate idea_execution_outcomes constraints', outerError);
    }
  }

  // Fix developer_decisions table
  if (tableExists(db, 'developer_decisions')) {
    try {
      db.exec('BEGIN TRANSACTION');
      try {
        db.prepare(`
          INSERT INTO developer_decisions (id, profile_id, project_id, decision_type, entity_id, entity_type, effort, accepted, created_at)
          VALUES ('__test_130__', '__test__', '__test__', 'idea_accept', '__test__', 'idea', 5, 1, datetime('now'))
        `).run();
        db.prepare(`DELETE FROM developer_decisions WHERE id = '__test_130__'`).run();
        db.exec('COMMIT');
        logger.info('developer_decisions already supports 1-10 scale');
      } catch (e: unknown) {
        db.exec('ROLLBACK');
        const error = e as Error;
        if (error.message?.includes('CHECK constraint')) {
          logger.info('Updating developer_decisions CHECK constraints to 1-10 scale...');

          db.exec(`
            CREATE TABLE developer_decisions_new (
              id TEXT PRIMARY KEY,
              profile_id TEXT NOT NULL,
              project_id TEXT NOT NULL,
              decision_type TEXT NOT NULL CHECK (decision_type IN ('idea_accept', 'idea_reject', 'pattern_apply', 'pattern_skip', 'suggestion_accept', 'suggestion_dismiss')),
              entity_id TEXT NOT NULL,
              entity_type TEXT NOT NULL,
              scan_type TEXT,
              category TEXT,
              effort INTEGER CHECK (effort IS NULL OR (effort >= 1 AND effort <= 10)),
              impact INTEGER CHECK (impact IS NULL OR (impact >= 1 AND impact <= 10)),
              accepted INTEGER NOT NULL,
              feedback TEXT,
              context_snapshot TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY (profile_id) REFERENCES developer_profiles(id) ON DELETE CASCADE
            );

            INSERT INTO developer_decisions_new SELECT * FROM developer_decisions;

            DROP TABLE developer_decisions;

            ALTER TABLE developer_decisions_new RENAME TO developer_decisions;

            CREATE INDEX IF NOT EXISTS idx_developer_decisions_profile ON developer_decisions(profile_id);
            CREATE INDEX IF NOT EXISTS idx_developer_decisions_project ON developer_decisions(project_id);
            CREATE INDEX IF NOT EXISTS idx_developer_decisions_type ON developer_decisions(decision_type);
            CREATE INDEX IF NOT EXISTS idx_developer_decisions_scan_type ON developer_decisions(profile_id, scan_type);
            CREATE INDEX IF NOT EXISTS idx_developer_decisions_category ON developer_decisions(profile_id, category);
            CREATE INDEX IF NOT EXISTS idx_developer_decisions_created ON developer_decisions(profile_id, created_at DESC);
          `);

          logger.success('developer_decisions constraints updated to 1-10 scale');
        } else {
          throw e;
        }
      }
    } catch (outerError) {
      logger.error('Failed to migrate developer_decisions constraints', outerError);
    }
  }
}
