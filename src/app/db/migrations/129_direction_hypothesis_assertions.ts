/**
 * Migration 129: Add hypothesis_assertions column to directions
 *
 * Stores structured, machine-checkable assertions extracted from
 * the direction's success criteria. Each assertion declares a
 * measurable condition (e.g., "files_changed < 5") that can be
 * validated against direction_outcomes data after execution.
 *
 * Column stores a JSON string: HypothesisAssertion[]
 */

import { addColumnIfNotExists } from './migration.utils';
import type { MigrationLogger } from './migration.utils';

export function migrate129DirectionHypothesisAssertions(
  db: { exec: (sql: string) => void; prepare: (sql: string) => any },
  logger: MigrationLogger
) {
  addColumnIfNotExists(db as any, 'directions', 'hypothesis_assertions', 'TEXT', logger);
  logger.info('[Migration 129] Added hypothesis_assertions column to directions');
}
