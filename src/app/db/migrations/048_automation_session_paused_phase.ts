/**
 * Migration 048: Add 'paused' phase to automation_sessions
 * Updates the CHECK constraint to include 'paused' as a valid phase
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

function columnExists(db: Database.Database, tableName: string, columnName: string): boolean {
  const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return tableInfo.some(col => col.name === columnName);
}

export function migrate048AutomationSessionPausedPhase(db: Database.Database): void {
  // Skip if table doesn't exist
  if (!tableExists(db, 'automation_sessions')) {
    return;
  }

  // Check if we need to migrate by looking at the table schema
  const tableInfo = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='automation_sessions'
  `).get() as { sql: string } | undefined;

  if (!tableInfo) {
    return;
  }

  // If 'paused' is already in the constraint, skip
  if (tableInfo.sql.includes("'paused'")) {
    return;
  }

  console.log('[Migration 048] Adding paused phase to automation_sessions...');

  // SQLite doesn't support modifying CHECK constraints, so we need to:
  // 1. Create a new table with the updated constraint
  // 2. Copy data from old table
  // 3. Drop old table
  // 4. Rename new table

  db.exec(`
    -- Create new table with updated CHECK constraint
    CREATE TABLE automation_sessions_new (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_path TEXT NOT NULL,
      phase TEXT NOT NULL DEFAULT 'pending' CHECK (
        phase IN ('pending', 'running', 'exploring', 'generating', 'evaluating', 'complete', 'failed', 'paused')
      ),
      task_id TEXT,
      claude_session_id TEXT,
      config TEXT NOT NULL,
      result TEXT,
      error_message TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Copy data from old table
    INSERT INTO automation_sessions_new
    SELECT * FROM automation_sessions;

    -- Drop old table
    DROP TABLE automation_sessions;

    -- Rename new table
    ALTER TABLE automation_sessions_new RENAME TO automation_sessions;

    -- Recreate indexes
    CREATE INDEX IF NOT EXISTS idx_automation_sessions_project_id
      ON automation_sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_automation_sessions_phase
      ON automation_sessions(phase);
    CREATE INDEX IF NOT EXISTS idx_automation_sessions_task_id
      ON automation_sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_automation_sessions_started_at
      ON automation_sessions(started_at DESC);
  `);

  console.log('[Migration 048] Successfully added paused phase to automation_sessions');
}
