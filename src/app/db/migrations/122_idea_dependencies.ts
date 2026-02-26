/**
 * Migration 122: Idea Dependencies
 *
 * Creates the idea_dependencies table for linking ideas with
 * 'blocks', 'enables', or 'conflicts_with' relationships.
 * Transforms isolated ideas into coherent implementation roadmaps.
 */

import type { DbConnection } from '../drivers/types';
import { safeMigration, createTableIfNotExists, type MigrationLogger } from './migration.utils';

export function migrate122IdeaDependencies(db: DbConnection, logger: MigrationLogger): void {
  safeMigration('122_idea_dependencies', () => {
    createTableIfNotExists(db, 'idea_dependencies', `
      CREATE TABLE idea_dependencies (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL CHECK(relationship_type IN ('blocks', 'enables', 'conflicts_with')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (source_id) REFERENCES ideas(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES ideas(id) ON DELETE CASCADE
      )
    `, logger);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_idea_deps_source ON idea_dependencies(source_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_idea_deps_target ON idea_dependencies(target_id)`);
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_idea_deps_unique ON idea_dependencies(source_id, target_id, relationship_type)`);

    logger.success('Migration 122: Idea Dependencies table created');
  }, logger);
}
