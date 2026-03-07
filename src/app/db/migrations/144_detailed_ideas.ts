/**
 * Migration 143: Detailed Ideas Flag
 * Adds a `detailed` column to the ideas table to mark ideas that include
 * implementation procedure steps for execution by less capable LLMs.
 */

import { addColumnsIfNotExist, safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate144DetailedIdeas(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('detailedIdeas', () => {
    addColumnsIfNotExist(db, 'ideas', [
      { name: 'detailed', definition: 'INTEGER DEFAULT 0' },
    ], logger);

    logger?.info?.('Detailed ideas column added');
  }, logger);
}
