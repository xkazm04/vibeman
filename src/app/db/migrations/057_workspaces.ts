/**
 * Migration 057: Workspaces
 * Creates tables for workspace-based project grouping
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate057Workspaces(db: Database.Database): void {
  // Create workspaces table
  if (!tableExists(db, 'workspaces')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT NOT NULL DEFAULT '#6366f1',
        icon TEXT NOT NULL DEFAULT 'folder',
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_workspaces_position
        ON workspaces(position);
    `);

    console.log('[Migration 057] Created workspaces table');
  }

  // Create workspace_projects junction table
  if (!tableExists(db, 'workspace_projects')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS workspace_projects (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        project_id TEXT NOT NULL UNIQUE,
        position INTEGER NOT NULL DEFAULT 0,
        added_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_workspace_projects_workspace
        ON workspace_projects(workspace_id);
    `);

    console.log('[Migration 057] Created workspace_projects table');
  }
}
