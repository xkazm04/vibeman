/**
 * Migration 053: Prompt Templates
 * Creates table for storing reusable prompt templates per project
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate053PromptTemplates(db: Database.Database): void {
  // Skip if table already exists
  if (tableExists(db, 'prompt_templates')) {
    return;
  }

  // Create prompt_templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('storywriting', 'research', 'code_generation', 'analysis', 'review', 'custom')),
      template_content TEXT NOT NULL,
      variables TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create indexes for prompt_templates
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_prompt_templates_project_id
      ON prompt_templates(project_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_templates_category
      ON prompt_templates(category);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_templates_project_name
      ON prompt_templates(project_id, name);
  `);

  console.log('[Migration 053] Created prompt_templates table');
}
