/**
 * Migration 040: Social Discovery Configurations
 * Creates table for storing discovery search configurations
 */

import Database from 'better-sqlite3';

export function migrate040SocialDiscoveryConfigs(db: Database.Database): void {
  // Create social_discovery_configs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_discovery_configs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'x',
      query TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_search_at TEXT,
      results_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_discovery_configs_project_id
      ON social_discovery_configs(project_id);
    CREATE INDEX IF NOT EXISTS idx_discovery_configs_channel
      ON social_discovery_configs(project_id, channel);
    CREATE INDEX IF NOT EXISTS idx_discovery_configs_active
      ON social_discovery_configs(project_id, is_active);
  `);

  console.log('[Migration 040] Created social_discovery_configs table');
}
