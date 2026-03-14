/**
 * Migration 202: Execute Stage Columns
 *
 * Adds build_validation and checkpoint_type columns to conductor_runs
 * for the refactored execute stage. Both are nullable TEXT columns.
 */

import type { DbConnection } from '../drivers/types';
import { addColumnIfNotExists, runOnce, type MigrationLogger } from './migration.utils';

export function migrate202ExecuteStageColumns(db: DbConnection, logger?: MigrationLogger): void {
  runOnce(db, 'm202', () => {
    addColumnIfNotExists(db, 'conductor_runs', 'build_validation', 'TEXT', logger);
    addColumnIfNotExists(db, 'conductor_runs', 'checkpoint_type', 'TEXT', logger);
    logger?.success('Migration 202: added build_validation and checkpoint_type columns to conductor_runs');
  }, logger);
}
