/**
 * Migration 069: Fix Generation History Foreign Key
 *
 * The FK constraint on generation_history.template_id was invalid because
 * template_id is not unique in discovered_templates (only source_project_path + template_id is unique).
 *
 * This migration recreates the table without the FK constraint.
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate069FixGenerationHistoryFk(db: Database.Database): void {
  // Skip if generation_history doesn't exist (nothing to fix)
  if (!tableExists(db, 'generation_history')) {
    return;
  }

  // SQLite doesn't support ALTER TABLE to drop constraints, so we need to:
  // 1. Create a new table without the FK
  // 2. Copy data
  // 3. Drop old table
  // 4. Rename new table

  db.exec(`
    -- Create new table without FK constraint
    CREATE TABLE IF NOT EXISTS generation_history_new (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      query TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Copy existing data
    INSERT INTO generation_history_new (id, template_id, query, file_path, created_at)
    SELECT id, template_id, query, file_path, created_at
    FROM generation_history;

    -- Drop old table
    DROP TABLE generation_history;

    -- Rename new table
    ALTER TABLE generation_history_new RENAME TO generation_history;

    -- Recreate index
    CREATE INDEX IF NOT EXISTS idx_generation_history_created_at
      ON generation_history(created_at DESC);
  `);

  console.log('[Migration 069] Fixed generation_history FK constraint');
}
