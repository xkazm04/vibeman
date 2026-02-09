/**
 * Migration 072: Add source column to discovered_templates
 * Consolidates prompt_templates into discovered_templates by adding
 * a 'source' column to distinguish scanned vs manually-created templates.
 */

import Database from 'better-sqlite3';

function columnExists(db: Database.Database, table: string, column: string): boolean {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return info.some(col => col.name === column);
}

export function migrate072TemplateSourceColumn(db: Database.Database): void {
  if (columnExists(db, 'discovered_templates', 'source')) {
    return;
  }

  db.exec(`
    ALTER TABLE discovered_templates ADD COLUMN source TEXT NOT NULL DEFAULT 'scanned';
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_discovered_templates_source
      ON discovered_templates(source);
  `);

  console.log('[Migration 072] Added source column to discovered_templates');
}
