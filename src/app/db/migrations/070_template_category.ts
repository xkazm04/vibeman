/**
 * Migration 070: Template Category
 *
 * Adds category column to discovered_templates for grouping templates by subfolder.
 * Templates in templates/research/*.ts get category="research"
 * Templates in templates/feed/*.ts get category="feed"
 */

import Database from 'better-sqlite3';

function columnExists(db: Database.Database, tableName: string, columnName: string): boolean {
  const columns = db.pragma(`table_info(${tableName})`) as Array<{ name: string }>;
  return columns.some((col) => col.name === columnName);
}

export function migrate070TemplateCategory(db: Database.Database): void {
  // Skip if column already exists
  if (columnExists(db, 'discovered_templates', 'category')) {
    return;
  }

  // Add category column with default 'general'
  db.exec(`
    ALTER TABLE discovered_templates ADD COLUMN category TEXT NOT NULL DEFAULT 'general';
  `);

  // Create index for category-based queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_discovered_templates_category
      ON discovered_templates(category);
  `);

  console.log('[Migration 070] Added category column to discovered_templates');
}
