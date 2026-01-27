/**
 * Migration 062: Group Health Scans
 * Creates table for tracking code health scans per context group
 * Also adds health_score and last_scan_at columns to context_groups
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

export function migrate062GroupHealth(db: Database.Database): void {
  // Create group_health_scans table
  if (!tableExists(db, 'group_health_scans')) {
    db.exec(`
      CREATE TABLE group_health_scans (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
        health_score INTEGER,
        issues_found INTEGER DEFAULT 0,
        issues_fixed INTEGER DEFAULT 0,
        scan_summary TEXT,
        git_commit_hash TEXT,
        git_pushed INTEGER DEFAULT 0,
        execution_id TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_group_health_scans_group_id
        ON group_health_scans(group_id);
      CREATE INDEX idx_group_health_scans_project_id
        ON group_health_scans(project_id);
      CREATE INDEX idx_group_health_scans_status
        ON group_health_scans(status);
      CREATE INDEX idx_group_health_scans_created
        ON group_health_scans(created_at DESC);
    `);
    console.log('[Migration 062] Created group_health_scans table');
  }

  // Add health_score column to context_groups if not exists
  if (tableExists(db, 'context_groups') && !columnExists(db, 'context_groups', 'health_score')) {
    db.exec(`ALTER TABLE context_groups ADD COLUMN health_score INTEGER`);
    console.log('[Migration 062] Added health_score column to context_groups');
  }

  // Add last_scan_at column to context_groups if not exists
  if (tableExists(db, 'context_groups') && !columnExists(db, 'context_groups', 'last_scan_at')) {
    db.exec(`ALTER TABLE context_groups ADD COLUMN last_scan_at TEXT`);
    console.log('[Migration 062] Added last_scan_at column to context_groups');
  }

  console.log('[Migration 062] Group health migration complete');
}
