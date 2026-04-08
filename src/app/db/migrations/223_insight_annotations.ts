/**
 * Migration 223: Insight Annotations & Custom Tags
 *
 * Creates a table for user-authored annotations and custom tags on brain insights.
 * Annotations let users add free-text notes and categorize insights with tags.
 */

import type { DbConnection } from '../drivers/types';
import type { MigrationLogger } from './migration.utils';

export function migrate223InsightAnnotations(db: DbConnection, logger: MigrationLogger) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS brain_insight_annotations (
      id TEXT PRIMARY KEY,
      insight_id TEXT NOT NULL REFERENCES brain_insights(id) ON DELETE CASCADE,
      note TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_insight_annotations_insight ON brain_insight_annotations(insight_id);
    CREATE INDEX IF NOT EXISTS idx_insight_annotations_updated ON brain_insight_annotations(updated_at DESC);
  `);

  logger.info('[Migration 223] Created brain_insight_annotations table with indexes');
}
