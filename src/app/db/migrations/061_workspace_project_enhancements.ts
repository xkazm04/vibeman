/**
 * Migration 061: Workspace & Project Enhancements
 * - Adds base_path column to workspaces table for workspace-specific root directories
 */

import Database from 'better-sqlite3';

function columnExists(db: Database.Database, tableName: string, columnName: string): boolean {
  const result = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return result.some(col => col.name === columnName);
}

export function migrate061WorkspaceProjectEnhancements(db: Database.Database): void {
  // Add base_path column to workspaces table
  if (!columnExists(db, 'workspaces', 'base_path')) {
    db.exec(`ALTER TABLE workspaces ADD COLUMN base_path TEXT;`);
    console.log('[Migration 061] Added base_path column to workspaces table');
  }
}
