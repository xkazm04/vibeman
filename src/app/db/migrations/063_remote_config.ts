/**
 * Migration 063: Remote Message Broker Config
 * Creates table for storing Supabase credentials for the remote message broker
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate063RemoteConfig(db: Database.Database): void {
  // Create remote_config table
  if (!tableExists(db, 'remote_config')) {
    db.exec(`
      CREATE TABLE remote_config (
        id TEXT PRIMARY KEY,
        supabase_url TEXT NOT NULL,
        supabase_anon_key TEXT NOT NULL,
        supabase_service_role_key TEXT NOT NULL,
        is_configured INTEGER NOT NULL DEFAULT 0,
        last_validated_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_remote_config_is_configured
        ON remote_config(is_configured);
    `);
    console.log('[Migration 063] Created remote_config table');
  }

  console.log('[Migration 063] Remote config migration complete');
}
