/**
 * Migration 067: Discovered Templates
 * Creates table for storing discovered templates from external projects
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate067DiscoveredTemplates(db: Database.Database): void {
  // Skip if table already exists
  if (tableExists(db, 'discovered_templates')) {
    return;
  }

  // Create discovered_templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS discovered_templates (
      id TEXT PRIMARY KEY,
      source_project_path TEXT NOT NULL,
      file_path TEXT NOT NULL,
      template_id TEXT NOT NULL,
      template_name TEXT NOT NULL,
      description TEXT,
      config_json TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(source_project_path, template_id)
    );
  `);

  // Create indexes for discovered_templates
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_discovered_templates_source
      ON discovered_templates(source_project_path);
    CREATE INDEX IF NOT EXISTS idx_discovered_templates_template_id
      ON discovered_templates(template_id);
  `);

  console.log('[Migration 067] Created discovered_templates table');
}
