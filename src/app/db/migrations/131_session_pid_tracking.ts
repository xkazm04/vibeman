/**
 * Migration 131: Add PID tracking to claude_code_sessions
 *
 * Records the OS process ID of spawned CLI processes so that orphaned
 * processes from previous server instances can be detected and killed
 * on startup.
 */

import { getConnection } from '../drivers';
import { addColumnsIfNotExist, type MigrationLogger } from './migration.utils';

export function migrate131SessionPidTracking(db: ReturnType<typeof getConnection>, logger: MigrationLogger): void {
  const added = addColumnsIfNotExist(db, 'claude_code_sessions', [
    { name: 'pid', definition: 'INTEGER DEFAULT NULL' },
  ], logger);

  if (added > 0) {
    logger.success('Added pid column to claude_code_sessions');
  }
}
