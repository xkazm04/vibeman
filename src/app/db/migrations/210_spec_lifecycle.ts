/**
 * Migration 210: Spec Lifecycle — file_path column
 *
 * Adds `file_path TEXT` to conductor_specs so each spec row knows its
 * exact on-disk location. Used by SpecLifecycleManager for targeted
 * file cleanup and stale-spec purging.
 */

import type { DbConnection } from '../drivers/types';
import { addColumnIfNotExists, type MigrationLogger } from './migration.utils';

export function migrate210SpecLifecycle(db: DbConnection, logger?: MigrationLogger): void {
  addColumnIfNotExists(db, 'conductor_specs', 'file_path', 'TEXT', logger);
  logger?.success('Migration 210: conductor_specs.file_path column added');
}
