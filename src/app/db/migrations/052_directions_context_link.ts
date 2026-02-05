/**
 * Migration 052: Directions Context Link
 * Adds SQLite context references to directions table for unified context management
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

function columnExists(db: Database.Database, tableName: string, columnName: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
  return columns.some(col => col.name === columnName);
}

export function migrate052DirectionsContextLink(db: Database.Database): void {
  // Add new SQLite context-based columns to directions table
  if (!tableExists(db, 'directions')) {
    return;
  }

  let changesApplied = false;

  if (!columnExists(db, 'directions', 'context_id')) {
    db.exec(`ALTER TABLE directions ADD COLUMN context_id TEXT REFERENCES contexts(id) ON DELETE SET NULL`);
    console.log('[Migration 052] Added context_id column to directions table');
    changesApplied = true;
  }

  if (!columnExists(db, 'directions', 'context_name')) {
    db.exec(`ALTER TABLE directions ADD COLUMN context_name TEXT`);
    console.log('[Migration 052] Added context_name column to directions table');
    changesApplied = true;
  }

  if (!columnExists(db, 'directions', 'context_group_id')) {
    db.exec(`ALTER TABLE directions ADD COLUMN context_group_id TEXT REFERENCES context_groups(id) ON DELETE SET NULL`);
    console.log('[Migration 052] Added context_group_id column to directions table');
    changesApplied = true;
  }

  // Create indexes silently (IF NOT EXISTS handles idempotency)
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_directions_context ON directions(context_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_directions_context_group ON directions(context_group_id)`);
  } catch (e) {
    // Indexes might already exist
  }
}
