/**
 * Migration 068: Generation History
 * Creates table for storing generation history from template discovery
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate068GenerationHistory(db: Database.Database): void {
  // Skip if table already exists
  if (tableExists(db, 'generation_history')) {
    return;
  }

  // Create generation_history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS generation_history (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      query TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (template_id) REFERENCES discovered_templates(template_id)
    );
  `);

  // Create index on created_at DESC for chronological queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_generation_history_created_at
      ON generation_history(created_at DESC);
  `);

  console.log('[Migration 068] Created generation_history table');
}
