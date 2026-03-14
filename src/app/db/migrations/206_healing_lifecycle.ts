/**
 * Migration 206: Healing Lifecycle Columns
 *
 * Adds lifecycle tracking columns to conductor_healing_patches
 * (expires_at, application_count, success_count) and
 * error_classifications column to conductor_runs.
 */

import type { DbConnection } from '../drivers/types';
import { addColumnIfNotExists, runOnce, type MigrationLogger } from './migration.utils';

export function migrate206HealingLifecycle(db: DbConnection, logger?: MigrationLogger): void {
  runOnce(db, 'm206', () => {
    // Healing patch lifecycle columns
    addColumnIfNotExists(db, 'conductor_healing_patches', 'expires_at', 'TEXT', logger);
    addColumnIfNotExists(db, 'conductor_healing_patches', 'application_count', 'INTEGER DEFAULT 0', logger);
    addColumnIfNotExists(db, 'conductor_healing_patches', 'success_count', 'INTEGER DEFAULT 0', logger);

    // Error classification summary on runs
    addColumnIfNotExists(db, 'conductor_runs', 'error_classifications', 'TEXT', logger);

    logger?.success('Migration 206: added healing lifecycle columns');
  }, logger);
}
