/**
 * Migration 038: Social Channel Configurations
 * Creates tables for storing social channel integration configs
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate038SocialChannelConfigs(db: Database.Database): void {
  // Skip if tables already exist
  if (tableExists(db, 'social_channel_configs') && tableExists(db, 'social_channel_fetch_log')) {
    return;
  }

  // Create social_channel_configs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_channel_configs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      channel_type TEXT NOT NULL CHECK (channel_type IN ('instagram', 'facebook', 'x', 'gmail', 'discord')),
      name TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 1,

      -- Encrypted credentials stored as JSON
      credentials_encrypted TEXT NOT NULL,

      -- Channel-specific configuration as JSON
      config_json TEXT NOT NULL,

      -- Connection status tracking
      connection_status TEXT DEFAULT 'untested' CHECK (connection_status IN ('untested', 'connected', 'failed', 'expired')),
      last_connection_test TEXT,
      last_error TEXT,

      -- Fetch tracking
      last_fetch_at TEXT,
      items_fetched_count INTEGER DEFAULT 0,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create indexes for efficient queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_social_channel_configs_project_id
      ON social_channel_configs(project_id);
    CREATE INDEX IF NOT EXISTS idx_social_channel_configs_channel_type
      ON social_channel_configs(project_id, channel_type);
    CREATE INDEX IF NOT EXISTS idx_social_channel_configs_enabled
      ON social_channel_configs(project_id, is_enabled);
  `);

  // Create social_channel_fetch_log table for tracking fetches
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_channel_fetch_log (
      id TEXT PRIMARY KEY,
      config_id TEXT NOT NULL,
      fetch_started_at TEXT NOT NULL,
      fetch_completed_at TEXT,
      items_fetched INTEGER DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (config_id) REFERENCES social_channel_configs(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_social_channel_fetch_log_config_id
      ON social_channel_fetch_log(config_id);
    CREATE INDEX IF NOT EXISTS idx_social_channel_fetch_log_created_at
      ON social_channel_fetch_log(config_id, created_at);
  `);

  console.log('[Migration 038] Created social_channel_configs and social_channel_fetch_log tables');
}
