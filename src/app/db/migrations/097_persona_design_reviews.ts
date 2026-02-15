/**
 * Migration 097: Persona Design Reviews
 * Stores results of automated design engine QA test runs.
 */

import type { MigrationLogger } from './migration.utils';
import { createTableIfNotExists } from './migration.utils';

export function migrate097PersonaDesignReviews(db: any, logger: MigrationLogger) {
  createTableIfNotExists(db, 'persona_design_reviews', `
    CREATE TABLE persona_design_reviews (
      id TEXT PRIMARY KEY,
      test_case_id TEXT NOT NULL,
      test_case_name TEXT NOT NULL,
      instruction TEXT NOT NULL,
      status TEXT NOT NULL,
      structural_score INTEGER,
      semantic_score INTEGER,
      connectors_used TEXT,
      trigger_types TEXT,
      design_result TEXT,
      structural_evaluation TEXT,
      semantic_evaluation TEXT,
      test_run_id TEXT NOT NULL,
      reviewed_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `, logger);

  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pdr_test_case ON persona_design_reviews(test_case_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pdr_status ON persona_design_reviews(status)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pdr_reviewed ON persona_design_reviews(reviewed_at)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pdr_run ON persona_design_reviews(test_run_id)').run();
  } catch {
    // Indexes may already exist
  }

  logger.success('Migration 097 (persona_design_reviews) completed');
}
