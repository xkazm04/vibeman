/**
 * Migration 115: Direction Effort/Impact Scoring
 *
 * Adds effort and impact INTEGER columns to directions table
 * for prioritization scoring (1-10 scale).
 */

import { addColumnIfNotExists } from './migration.utils';
import type { MigrationLogger } from './migration.utils';

export function migrate115DirectionEffortImpact(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  try {
    addColumnIfNotExists(db as any, 'directions', 'effort', 'INTEGER');
    addColumnIfNotExists(db as any, 'directions', 'impact', 'INTEGER');
    logger.info('[Migration 115] Added effort and impact columns to directions');
  } catch (e: any) {
    logger.info('[Migration 115] effort/impact columns: ' + e.message);
  }
}
