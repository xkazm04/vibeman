/**
 * Migration 118: Add composite index for category GROUP BY queries
 *
 * The categories API and Tinder items endpoint filter by (project_id, status)
 * then GROUP BY category. This covering index lets SQLite serve the query
 * entirely from the index without scanning the main table.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate118IdeasCategoryCompositeIndex(
  db: { exec: (sql: string) => void },
  logger: MigrationLogger
): void {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ideas_project_status_category
    ON ideas (project_id, status, category)
  `);

  logger.info('Migration 118: Added composite index for ideas category queries');
}
