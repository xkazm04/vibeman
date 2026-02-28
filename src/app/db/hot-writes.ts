/**
 * Hot-Writes Database Connection
 *
 * Separate SQLite database for high-frequency append-only writes.
 * Dissolves write contention on the main goals.db by isolating
 * behavioral_signals and obs_api_calls into their own DB file.
 *
 * Tables housed here:
 * - behavioral_signals  (writes on every user action)
 * - obs_api_calls       (writes on every API request)
 *
 * An async aggregation worker periodically rolls up data from this DB
 * into the main database for complex queries and dashboards.
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

let hotDb: Database.Database | null = null;

/**
 * Get or create the hot-writes database connection.
 * Uses a separate SQLite file optimised for append-heavy workloads.
 */
export function getHotWritesDatabase(): Database.Database {
  if (hotDb) return hotDb;

  const dbDir = path.join(process.cwd(), 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = process.env.HOT_WRITES_DB_PATH || path.join(dbDir, 'hot-writes.db');
  hotDb = new Database(dbPath);

  // WAL mode is critical for append-heavy workloads — allows concurrent reads
  hotDb.pragma('journal_mode = WAL');
  hotDb.pragma('journal_size_limit = 33554432'); // 32 MB
  hotDb.pragma('synchronous = NORMAL');
  hotDb.pragma('cache_size = -16000'); // 16 MB — smaller than main DB
  hotDb.pragma('busy_timeout = 2000'); // shorter timeout since contention is lower

  initializeHotWritesTables(hotDb);

  return hotDb;
}

/**
 * Create tables in the hot-writes database.
 * Schema mirrors the main DB tables exactly so rows can be moved
 * between databases without transformation.
 */
function initializeHotWritesTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS behavioral_signals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      context_id TEXT,
      context_name TEXT,
      data TEXT,
      weight REAL DEFAULT 1.0,
      timestamp TEXT NOT NULL,
      decay_applied_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_hot_bs_project ON behavioral_signals(project_id);
    CREATE INDEX IF NOT EXISTS idx_hot_bs_type ON behavioral_signals(project_id, signal_type);
    CREATE INDEX IF NOT EXISTS idx_hot_bs_timestamp ON behavioral_signals(project_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_hot_bs_decay ON behavioral_signals(project_id, weight, decay_applied_at);

    CREATE TABLE IF NOT EXISTS obs_api_calls (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      status_code INTEGER,
      response_time_ms REAL,
      request_size_bytes INTEGER,
      response_size_bytes INTEGER,
      user_agent TEXT,
      error_message TEXT,
      called_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_hot_obs_project ON obs_api_calls(project_id);
    CREATE INDEX IF NOT EXISTS idx_hot_obs_endpoint ON obs_api_calls(project_id, endpoint);
    CREATE INDEX IF NOT EXISTS idx_hot_obs_called_at ON obs_api_calls(project_id, called_at);
  `);
}

/**
 * Close the hot-writes database connection.
 */
export function closeHotWritesDatabase(): void {
  if (hotDb) {
    try {
      hotDb.close();
    } catch {
      // May already be closed during shutdown
    }
    hotDb = null;
  }
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('exit', closeHotWritesDatabase);
}
