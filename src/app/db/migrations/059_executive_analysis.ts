/**
 * Migration 059: Executive Analysis
 * Creates table for AI-driven executive insight analysis sessions
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate059ExecutiveAnalysis(db: Database.Database): void {
  // Create executive_analysis table
  if (!tableExists(db, 'executive_analysis')) {
    db.exec(`
      CREATE TABLE executive_analysis (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        context_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
        trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled')),

        -- Analysis scope
        ideas_analyzed INTEGER DEFAULT 0,
        directions_analyzed INTEGER DEFAULT 0,
        time_window TEXT DEFAULT 'all',

        -- AI results
        ai_insights TEXT,
        ai_narrative TEXT,
        ai_recommendations TEXT,
        error_message TEXT,

        -- Timing
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_executive_analysis_project_id
        ON executive_analysis(project_id);
      CREATE INDEX idx_executive_analysis_status
        ON executive_analysis(status);
      CREATE INDEX idx_executive_analysis_created
        ON executive_analysis(created_at DESC);
    `);
    console.log('[Migration 059] Created executive_analysis table');
  }

  console.log('[Migration 059] Executive Analysis migration complete');
}
