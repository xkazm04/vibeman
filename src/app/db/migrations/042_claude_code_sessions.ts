/**
 * Migration 042: Claude Code Session Management
 * Creates tables for managing Claude Code sessions with --resume flag support
 */

import Database from 'better-sqlite3';

export function migrate042ClaudeCodeSessions(db: Database.Database): void {
  // Create claude_code_sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS claude_code_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      claude_session_id TEXT,
      task_ids TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
      context_tokens INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create indexes for claude_code_sessions
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_claude_code_sessions_project_id
      ON claude_code_sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_claude_code_sessions_status
      ON claude_code_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_claude_code_sessions_claude_session_id
      ON claude_code_sessions(claude_session_id);
  `);

  // Create session_tasks table for ordered task tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_tasks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      requirement_name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
      claude_session_id TEXT,
      started_at TEXT,
      completed_at TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES claude_code_sessions(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for session_tasks
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_session_tasks_session_id
      ON session_tasks(session_id);
    CREATE INDEX IF NOT EXISTS idx_session_tasks_task_id
      ON session_tasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_session_tasks_status
      ON session_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_session_tasks_order
      ON session_tasks(session_id, order_index ASC);
  `);

  console.log('[Migration 042] Created Claude Code session tables (claude_code_sessions, session_tasks)');
}
