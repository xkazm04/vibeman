/**
 * Migration 219: Create saved_views table for cross-entity queryable views
 *
 * Enables users to create Bases-style saved views that query across entity types
 * (ideas, goals, contexts, questions, directions, knowledge_entries, tech_debt).
 * Each view stores filter configuration, visible columns, sort order, and
 * optional group-by field.
 */

import type { DbConnection } from '../drivers/types';
import type { MigrationLogger } from './migration.utils';

export function migrate219SavedViews(db: DbConnection, logger: MigrationLogger) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_views (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      entity_types TEXT NOT NULL DEFAULT '[]',
      filters TEXT NOT NULL DEFAULT '{}',
      visible_columns TEXT NOT NULL DEFAULT '[]',
      sort_field TEXT,
      sort_direction TEXT NOT NULL DEFAULT 'desc' CHECK (sort_direction IN ('asc', 'desc')),
      group_by TEXT,
      icon TEXT,
      color TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_saved_views_project_id ON saved_views(project_id);
    CREATE INDEX IF NOT EXISTS idx_saved_views_pinned ON saved_views(project_id, pinned DESC, updated_at DESC);
  `);

  logger.info('[Migration 219] Created saved_views table with indexes');
}
