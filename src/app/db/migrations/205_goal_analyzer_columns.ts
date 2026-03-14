/**
 * Migration 205: Goal Analyzer Columns
 *
 * Adds gap_report nullable TEXT column to conductor_runs
 * for storing the goal analyzer's gap analysis results.
 */

import type { DbConnection } from '../drivers/types';
import { addColumnIfNotExists, runOnce, type MigrationLogger } from './migration.utils';

export function migrate205GoalAnalyzerColumns(db: DbConnection, logger?: MigrationLogger): void {
  runOnce(db, 'm205', () => {
    addColumnIfNotExists(db, 'conductor_runs', 'gap_report', 'TEXT', logger);
    logger?.success('Migration 205: added gap_report column to conductor_runs');
  }, logger);
}
