/**
 * Migration 069: Context AI Navigation Metadata
 * Adds columns to contexts table for AI-driven codebase navigation:
 * - entry_points: Primary files a CLI agent should read first
 * - db_tables: Database tables this context reads/writes
 * - keywords: Search keywords for fuzzy matching
 * - api_surface: API endpoints with methods and descriptions
 * - cross_refs: Related context IDs with relationship types
 * - tech_stack: Key technologies/libraries used
 */

import { addColumnsIfNotExist, safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate069ContextAiNavigation(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('contextAiNavigation', () => {
    const added = addColumnsIfNotExist(db, 'contexts', [
      { name: 'entry_points', definition: 'TEXT' },    // JSON: [{path, type}]
      { name: 'db_tables', definition: 'TEXT' },        // JSON: string[]
      { name: 'keywords', definition: 'TEXT' },         // JSON: string[]
      { name: 'api_surface', definition: 'TEXT' },      // JSON: [{path, methods, description}]
      { name: 'cross_refs', definition: 'TEXT' },       // JSON: [{contextId, relationship}]
      { name: 'tech_stack', definition: 'TEXT' },       // JSON: string[]
    ], logger);

    if (added > 0) {
      logger?.info(`Added ${added} AI navigation columns to contexts table`);
    } else {
      logger?.info('Contexts table already has AI navigation columns');
    }
  }, logger);
}
