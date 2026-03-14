/**
 * Migration 200: Conductor Foundation Schema Evolution
 *
 * Evolves conductor_runs and goals tables with new columns needed for
 * the redesigned conductor pipeline (Phase 1 Foundation).
 *
 * - conductor_runs: goal linkage, abort flag, process log, error message, queued timestamp
 * - goals: constraint columns for structured goal input (target paths, sessions, priority, etc.)
 */

import type { DbConnection } from '../drivers/types';
import { addColumnsIfNotExist, type MigrationLogger } from './migration.utils';

export function migrate200ConductorFoundation(db: DbConnection, logger?: MigrationLogger): void {
  // Evolve conductor_runs with new columns
  addColumnsIfNotExist(db, 'conductor_runs', [
    { name: 'goal_id', definition: 'TEXT' },
    { name: 'should_abort', definition: 'INTEGER DEFAULT 0' },
    { name: 'error_message', definition: 'TEXT' },
    { name: 'queued_at', definition: 'TEXT' },
  ], logger);

  // Note: process_log already exists in conductor_runs (from original schema)
  // Adding it idempotently in case older DBs don't have it
  addColumnsIfNotExist(db, 'conductor_runs', [
    { name: 'process_log', definition: "TEXT DEFAULT '[]'" },
  ], logger);

  // Evolve goals table with constraint columns
  addColumnsIfNotExist(db, 'goals', [
    { name: 'target_paths', definition: 'TEXT' },
    { name: 'excluded_paths', definition: 'TEXT' },
    { name: 'max_sessions', definition: 'INTEGER DEFAULT 2' },
    { name: 'priority', definition: "TEXT DEFAULT 'normal'" },
    { name: 'checkpoint_config', definition: 'TEXT' },
    { name: 'use_brain', definition: 'INTEGER DEFAULT 1' },
  ], logger);
}
