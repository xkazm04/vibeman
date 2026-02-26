/**
 * Migration 113: Direction Decision Record
 *
 * Adds decision_record TEXT column to directions table
 * for storing structured Architecture Decision Records (ADRs)
 */

import { addColumnIfNotExists } from './migration.utils';
import type { MigrationLogger } from './migration.utils';

export function migrate113DirectionDecisionRecord(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  try {
    addColumnIfNotExists(db as any, 'directions', 'decision_record', 'TEXT');
    logger.info('[Migration 113] Added decision_record column to directions');
  } catch (e: any) {
    logger.info('[Migration 113] decision_record column: ' + e.message);
  }
}
