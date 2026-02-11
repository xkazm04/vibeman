/**
 * Migration 094: Persona Design Result
 * Adds last_design_result column to personas table to persist
 * the design analysis output for display after applying.
 */

import { addColumnIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate094PersonaDesignResult(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('persona_design_result', () => {
    addColumnIfNotExists(db, 'personas', 'last_design_result', 'TEXT', logger);
  }, logger);
}
