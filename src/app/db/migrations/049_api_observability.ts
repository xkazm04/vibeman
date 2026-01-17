/**
 * Migration 049: API Observability Tables
 * Tracks API endpoint usage, response times, and error rates for development observability
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate049ApiObservability(db: Database.Database): void {
  // Raw API call logs
  if (!tableExists(db, 'obs_api_calls')) {
    db.exec(`
      CREATE TABLE obs_api_calls (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
        status_code INTEGER,
        response_time_ms INTEGER,
        request_size_bytes INTEGER,
        response_size_bytes INTEGER,
        user_agent TEXT,
        error_message TEXT,
        called_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_obs_api_calls_project ON obs_api_calls(project_id);
      CREATE INDEX idx_obs_api_calls_endpoint ON obs_api_calls(endpoint);
      CREATE INDEX idx_obs_api_calls_called_at ON obs_api_calls(called_at DESC);
      CREATE INDEX idx_obs_api_calls_project_endpoint ON obs_api_calls(project_id, endpoint);
    `);
    console.log('[Migration 049] Created obs_api_calls table');
  }

  // Aggregated endpoint statistics (hourly rollups)
  if (!tableExists(db, 'obs_endpoint_stats')) {
    db.exec(`
      CREATE TABLE obs_endpoint_stats (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        call_count INTEGER NOT NULL DEFAULT 0,
        avg_response_time_ms REAL,
        max_response_time_ms INTEGER,
        error_count INTEGER NOT NULL DEFAULT 0,
        total_request_bytes INTEGER NOT NULL DEFAULT 0,
        total_response_bytes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(project_id, endpoint, method, period_start)
      );

      CREATE INDEX idx_obs_endpoint_stats_project ON obs_endpoint_stats(project_id);
      CREATE INDEX idx_obs_endpoint_stats_period ON obs_endpoint_stats(period_start DESC);
      CREATE INDEX idx_obs_endpoint_stats_endpoint ON obs_endpoint_stats(project_id, endpoint);
    `);
    console.log('[Migration 049] Created obs_endpoint_stats table');
  }

  // Observability configuration per project
  if (!tableExists(db, 'obs_config')) {
    db.exec(`
      CREATE TABLE obs_config (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL UNIQUE,
        enabled INTEGER NOT NULL DEFAULT 1,
        provider TEXT NOT NULL DEFAULT 'local' CHECK (provider IN ('local', 'sentry')),
        sentry_dsn TEXT,
        sample_rate REAL NOT NULL DEFAULT 1.0,
        endpoints_to_track TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT
      );

      CREATE INDEX idx_obs_config_project ON obs_config(project_id);
    `);
    console.log('[Migration 049] Created obs_config table');
  }
}
