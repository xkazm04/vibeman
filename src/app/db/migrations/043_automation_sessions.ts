/**
 * Migration 043: Automation Sessions
 * Creates table for tracking standup automation sessions executed via Claude Code
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate043AutomationSessions(db: Database.Database): void {
  // Skip if table already exists
  if (tableExists(db, 'automation_sessions')) {
    return;
  }

  // Create automation_sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS automation_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_path TEXT NOT NULL,
      phase TEXT NOT NULL DEFAULT 'pending' CHECK (
        phase IN ('pending', 'running', 'exploring', 'generating', 'evaluating', 'complete', 'failed')
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
  `);

  // Create indexes for automation_sessions
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_automation_sessions_project_id
      ON automation_sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_automation_sessions_phase
      ON automation_sessions(phase);
    CREATE INDEX IF NOT EXISTS idx_automation_sessions_task_id
      ON automation_sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_automation_sessions_started_at
      ON automation_sessions(started_at DESC);
  `);

  console.log('[Migration 043] Created automation_sessions table');
}
