/**
 * Migration 044: Automation Session Events
 * Creates table for tracking real-time events during automation sessions
 * Enables live session dashboard with file exploration, findings, and progress
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate044AutomationSessionEvents(db: Database.Database): void {
  // Skip if table already exists
  if (tableExists(db, 'automation_session_events')) {
    return;
  }

  // Create automation_session_events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS automation_session_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (
        event_type IN ('file_read', 'finding', 'progress', 'candidate', 'evaluation', 'phase_change', 'error')
      ),
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      data TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES automation_sessions(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for efficient querying
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_session_events_session
      ON automation_session_events(session_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_session_events_type
      ON automation_session_events(session_id, event_type);
  `);

  console.log('[Migration 044] Created automation_session_events table');
}
