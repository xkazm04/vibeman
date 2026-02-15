/**
 * Migration 101: Create insight_effectiveness_cache table
 *
 * Caches computed insight effectiveness scores per project to avoid
 * expensive O(insights × directions) cross-join recalculation on every request.
 * Cache entries are invalidated when directions are accepted (data changes).
 * Entries older than 24 hours are considered stale.
 */

import { getConnection } from '../drivers';
import { safeMigration, type MigrationLogger } from './migration.utils';

export function migrate101InsightEffectivenessCache(logger: MigrationLogger) {
  safeMigration('insightEffectivenessCache', () => {
    const db = getConnection();
    db.exec(`
      CREATE TABLE IF NOT EXISTS insight_effectiveness_cache (
        project_id TEXT NOT NULL,
        min_directions INTEGER NOT NULL DEFAULT 3,
        insights_json TEXT NOT NULL,
        summary_json TEXT NOT NULL,
        cached_at TEXT NOT NULL,
        PRIMARY KEY (project_id, min_directions)
      )
    `);
    logger.info('[Migration 101] Created insight_effectiveness_cache table');
  }, logger);
}
