/**
 * Migration 211: Conductor v3 Columns
 *
 * Adds columns to conductor_runs for the v3 3-phase adaptive pipeline:
 * - pipeline_version: distinguishes v2 (default) from v3 runs
 * - reflection_history: JSON array of ReflectOutput from each cycle
 * - brain_qa: JSON brain Q&A data from pre-cycle Brain questions
 */

import type { DbConnection } from '../drivers/types';
import { addColumnIfNotExists, runOnce, type MigrationLogger } from './migration.utils';

export function migrate211ConductorV3(db: DbConnection, logger?: MigrationLogger): void {
  runOnce(db, 'm211', () => {
    addColumnIfNotExists(db, 'conductor_runs', 'pipeline_version', 'INTEGER DEFAULT 2', logger);
    addColumnIfNotExists(db, 'conductor_runs', 'reflection_history', 'TEXT', logger);
    addColumnIfNotExists(db, 'conductor_runs', 'brain_qa', 'TEXT', logger);

    logger?.success('Migration 211: added conductor v3 columns');
  }, logger);
}
