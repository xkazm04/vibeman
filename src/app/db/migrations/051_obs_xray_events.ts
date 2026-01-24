/**
 * Migration 051: X-Ray Events Table
 * Persists API traffic events with context mapping for real-time visualization
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate051ObsXRayEvents(db: Database.Database): void {
  // Create obs_xray_events table for persisted X-Ray traffic
  if (!tableExists(db, 'obs_xray_events')) {
    db.exec(`
      CREATE TABLE obs_xray_events (
        id TEXT PRIMARY KEY,
        api_call_id TEXT,
        context_id TEXT,
        context_group_id TEXT,
        source_layer TEXT CHECK (source_layer IN ('pages', 'client', 'server') OR source_layer IS NULL),
        target_layer TEXT CHECK (target_layer IN ('server', 'external') OR target_layer IS NULL),
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        status INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (api_call_id) REFERENCES obs_api_calls(id) ON DELETE SET NULL,
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL,
        FOREIGN KEY (context_group_id) REFERENCES context_groups(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_xray_events_timestamp ON obs_xray_events(timestamp DESC);
      CREATE INDEX idx_xray_events_context ON obs_xray_events(context_id);
      CREATE INDEX idx_xray_events_group ON obs_xray_events(context_group_id);
      CREATE INDEX idx_xray_events_path ON obs_xray_events(path);
      CREATE INDEX idx_xray_events_api_call ON obs_xray_events(api_call_id);
    `);
    console.log('[Migration 051] Created obs_xray_events table');
  }
}
