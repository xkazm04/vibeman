/**
 * Migration 125: Create direction_preference_profiles table
 *
 * Caches computed preference profiles derived from historical pair decisions.
 * Invalidated when new pair decisions are made (accept or reject).
 * One row per project_id — upserted on recomputation.
 */

import { getConnection } from '../drivers';
import { safeMigration, type MigrationLogger } from './migration.utils';

export function migrate125DirectionPreferenceProfiles(_db: ReturnType<typeof getConnection>, logger: MigrationLogger) {
  safeMigration('directionPreferenceProfiles', () => {
    const db = getConnection();
    db.exec(`
      CREATE TABLE IF NOT EXISTS direction_preference_profiles (
        project_id TEXT PRIMARY KEY,
        vector_json TEXT NOT NULL,
        sample_count INTEGER NOT NULL DEFAULT 0,
        axis_counts_json TEXT NOT NULL,
        stability REAL NOT NULL DEFAULT 0,
        computed_at TEXT NOT NULL DEFAULT (datetime('now')),
        invalidated_at TEXT
      )
    `);

    logger.info('[Migration 125] Created direction_preference_profiles table');
  }, logger);
}
