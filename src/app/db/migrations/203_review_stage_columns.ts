/**
 * Migration 203: Review Stage Columns
 *
 * Adds execution_report and review_results columns to conductor_runs
 * for the refactored review stage. Both are nullable TEXT columns
 * (JSON stringified on write, parsed on read).
 */

import type { DbConnection } from '../drivers/types';
import { addColumnIfNotExists, runOnce, type MigrationLogger } from './migration.utils';

export function migrate203ReviewStageColumns(db: DbConnection, logger?: MigrationLogger): void {
  runOnce(db, 'm203', () => {
    addColumnIfNotExists(db, 'conductor_runs', 'execution_report', 'TEXT', logger);
    addColumnIfNotExists(db, 'conductor_runs', 'review_results', 'TEXT', logger);
    logger?.success('Migration 203: added execution_report and review_results columns to conductor_runs');
  }, logger);
}
