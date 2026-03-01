/**
 * Migration 124: Create insight_influence_log table
 *
 * Tracks which insights were actually SHOWN to users during decision-making
 * and whether the user acted on them. This enables causal validation of
 * insight effectiveness by comparing outcomes for insight-influenced vs
 * non-influenced decisions.
 *
 * Each row represents one "insight was visible when decision was made" event.
 */

import { getConnection } from '../drivers';
import { safeMigration, type MigrationLogger } from './migration.utils';

export function migrate124InsightInfluenceLog(_db: ReturnType<typeof getConnection>, logger: MigrationLogger) {
  safeMigration('insightInfluenceLog', () => {
    const db = getConnection();
    db.exec(`
      CREATE TABLE IF NOT EXISTS insight_influence_log (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        insight_id TEXT NOT NULL,
        insight_title TEXT NOT NULL,
        direction_id TEXT NOT NULL,
        decision TEXT NOT NULL CHECK(decision IN ('accepted', 'rejected')),
        influence_shown_at TEXT NOT NULL,
        decided_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_influence_log_project
        ON insight_influence_log(project_id)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_influence_log_insight
        ON insight_influence_log(insight_id)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_influence_log_direction
        ON insight_influence_log(direction_id)
    `);

    logger.info('[Migration 124] Created insight_influence_log table with indexes');
  }, logger);
}
