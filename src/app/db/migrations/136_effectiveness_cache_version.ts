/**
 * Migration 136: Add version column to insight_effectiveness_cache
 *
 * Adds a version number to the effectiveness cache table to enable
 * client-side cache invalidation detection. Version is incremented
 * on every invalidation, allowing clients to detect when their
 * local cached data is stale.
 */

import { getConnection } from '../drivers';
import { addColumnIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';

export function migrate136EffectivenessCacheVersion(logger: MigrationLogger) {
  safeMigration('effectivenessCacheVersion', () => {
    const db = getConnection();

    // Add version column with default value 1
    addColumnIfNotExists(
      db,
      'insight_effectiveness_cache',
      'version',
      'INTEGER NOT NULL DEFAULT 1',
      logger
    );

    logger.info('[Migration 136] Added version column to insight_effectiveness_cache');
  }, logger);
}
