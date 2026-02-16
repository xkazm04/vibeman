/**
 * Migration 104: Execution Flows
 *
 * Adds execution_flows column to persona_executions table
 * to store extracted execution flow diagrams as JSON.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate104ExecutionFlows(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  try {
    db.prepare('ALTER TABLE persona_executions ADD COLUMN execution_flows TEXT').run();
    logger.info('[Migration 104] Added execution_flows column to persona_executions');
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      throw e;
    }
    logger.info('[Migration 104] execution_flows column already exists');
  }
}
