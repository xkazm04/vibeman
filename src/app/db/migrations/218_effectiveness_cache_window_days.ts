/**
 * Migration 218: Add window_days to insight_effectiveness_cache primary key
 *
 * The cache previously keyed on (project_id, min_directions), ignoring the
 * windowDays query parameter. This caused stale cache hits when users changed
 * the analysis window. Since this is a cache table, we drop and recreate it
 * with the corrected composite primary key.
 */

import type { Database } from 'better-sqlite3';
import type { MigrationLogger } from './migration.utils';

export function migrate218EffectivenessCacheWindowDays(db: Database, logger: MigrationLogger) {
  db.exec(`DROP TABLE IF EXISTS insight_effectiveness_cache`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS insight_effectiveness_cache (
      project_id TEXT NOT NULL,
      min_directions INTEGER NOT NULL DEFAULT 3,
      window_days INTEGER NOT NULL DEFAULT 90,
      insights_json TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      cached_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (project_id, min_directions, window_days)
    )
  `);
  logger.info('[Migration 218] Recreated insight_effectiveness_cache with window_days in primary key');
}
