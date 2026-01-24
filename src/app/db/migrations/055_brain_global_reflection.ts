/**
 * Migration 055: Brain Global Reflection - Add scope column
 * Adds 'scope' column to brain_reflections table to distinguish
 * per-project reflections from global (cross-project) ones.
 */

import Database from 'better-sqlite3';

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const columns = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
  return columns.some(c => c.name === column);
}

export function migrate055BrainGlobalReflection(db: Database.Database): void {
  if (!hasColumn(db, 'brain_reflections', 'scope')) {
    db.exec(`
      ALTER TABLE brain_reflections ADD COLUMN scope TEXT DEFAULT 'project';
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_brain_reflections_scope
        ON brain_reflections(scope);
    `);

    console.log('[Migration 055] Added scope column to brain_reflections');
  }
}
