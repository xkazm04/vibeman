/**
 * Migration 204: Triage Data Column
 *
 * Adds triage_data nullable TEXT column to conductor_runs
 * for storing triage checkpoint state (items, scores, conflict flags, decisions).
 */

import type { DbConnection } from '../drivers/types';
import { addColumnIfNotExists, runOnce, type MigrationLogger } from './migration.utils';

export function migrate204TriageDataColumn(db: DbConnection, logger?: MigrationLogger): void {
  runOnce(db, 'm204', () => {
    addColumnIfNotExists(db, 'conductor_runs', 'triage_data', 'TEXT', logger);
    logger?.success('Migration 204: added triage_data column to conductor_runs');
  }, logger);
}
