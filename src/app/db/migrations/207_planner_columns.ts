/**
 * Migration 207: Planner & Intent Refinement Columns
 *
 * Adds `refined_intent` (G5 intent refinement Q&A) and
 * `planner_output` (planner backlog + composite groups) to conductor_runs.
 */

import type { DbConnection } from '../drivers/types';
import { addColumnIfNotExists, runOnce, type MigrationLogger } from './migration.utils';

export function migrate207PlannerColumns(db: DbConnection, logger?: MigrationLogger): void {
  runOnce(db, 'm207', () => {
    addColumnIfNotExists(db, 'conductor_runs', 'refined_intent', 'TEXT', logger);
    addColumnIfNotExists(db, 'conductor_runs', 'planner_output', 'TEXT', logger);

    logger?.success('Migration 207: added planner & intent refinement columns');
  }, logger);
}
