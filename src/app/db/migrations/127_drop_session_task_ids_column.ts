/**
 * Migration 127: Drop task_ids column from claude_code_sessions
 *
 * The task_ids column stored a JSON-stringified array that duplicated
 * the session_tasks junction table. Every addTask/removeTask performed
 * JSON.parse, array manipulation, then JSON.stringify — 3 round-trips
 * per mutation. The junction table is the source of truth; task IDs are
 * now derived via sessionRepository.getTaskIds() using a simple SELECT.
 */

import { hasColumn } from './migration.utils';
import type { MigrationLogger } from './migration.utils';

export function migrate127DropSessionTaskIdsColumn(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  try {
    if (!hasColumn(db as any, 'claude_code_sessions', 'task_ids')) {
      logger.info('[Migration 127] task_ids column already removed from claude_code_sessions');
      return;
    }

    // SQLite 3.35.0+ supports ALTER TABLE DROP COLUMN
    db.exec('ALTER TABLE claude_code_sessions DROP COLUMN task_ids');
    logger.info('[Migration 127] Dropped task_ids column from claude_code_sessions');
  } catch (e: any) {
    logger.info('[Migration 127] Drop task_ids column: ' + e.message);
  }
}
