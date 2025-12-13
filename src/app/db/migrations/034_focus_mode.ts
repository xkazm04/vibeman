/**
 * Migration 034: Focus Mode Tables
 *
 * Creates tables for:
 * - focus_sessions: Focus/pomodoro sessions with productivity tracking
 * - focus_breaks: Break periods between focus sessions
 * - focus_stats: Daily focus statistics and streaks
 */

import { getConnection } from '../drivers';
import { createTableIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';

export function migrateFocusModeTables(logger: MigrationLogger) {
  const db = getConnection();

  // Create focus_sessions table
  safeMigration('focusSessionsTable', () => {
    const created = createTableIfNotExists(db, 'focus_sessions', `
      CREATE TABLE focus_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        goal_id TEXT,
        context_id TEXT,

        -- Session configuration
        title TEXT NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL,
        session_type TEXT NOT NULL CHECK (session_type IN ('pomodoro', 'deep_work', 'custom')),

        -- Status tracking
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'abandoned')),
        started_at TEXT,
        paused_at TEXT,
        completed_at TEXT,

        -- Time tracking
        total_elapsed_seconds INTEGER NOT NULL DEFAULT 0,
        total_paused_seconds INTEGER NOT NULL DEFAULT 0,

        -- Pomodoro tracking
        pomodoro_count INTEGER NOT NULL DEFAULT 0,
        pomodoro_target INTEGER NOT NULL DEFAULT 4,
        current_pomodoro_start TEXT,

        -- Productivity metrics
        productivity_score INTEGER CHECK (productivity_score >= 0 AND productivity_score <= 100),
        focus_quality TEXT CHECK (focus_quality IN ('excellent', 'good', 'fair', 'poor')),
        distractions_count INTEGER NOT NULL DEFAULT 0,

        -- AI suggestions
        ai_suggested_duration INTEGER,
        ai_suggestion_reason TEXT,

        -- Session notes
        notes TEXT,
        accomplishments TEXT,

        -- Metadata
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, logger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_focus_sessions_project ON focus_sessions(project_id);
        CREATE INDEX idx_focus_sessions_status ON focus_sessions(status);
        CREATE INDEX idx_focus_sessions_started_at ON focus_sessions(started_at DESC);
        CREATE INDEX idx_focus_sessions_goal ON focus_sessions(goal_id);
        CREATE INDEX idx_focus_sessions_context ON focus_sessions(context_id);
      `);
      logger.info('focus_sessions table created successfully');
    }
  }, logger);

  // Create focus_breaks table
  safeMigration('focusBreaksTable', () => {
    const created = createTableIfNotExists(db, 'focus_breaks', `
      CREATE TABLE focus_breaks (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        break_type TEXT NOT NULL CHECK (break_type IN ('short', 'long', 'custom')),
        duration_minutes INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        skipped INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES focus_sessions(id) ON DELETE CASCADE
      )
    `, logger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_focus_breaks_session ON focus_breaks(session_id);
      `);
      logger.info('focus_breaks table created successfully');
    }
  }, logger);

  // Create focus_stats table
  safeMigration('focusStatsTable', () => {
    const created = createTableIfNotExists(db, 'focus_stats', `
      CREATE TABLE focus_stats (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        date TEXT NOT NULL,

        -- Session counts
        total_sessions INTEGER NOT NULL DEFAULT 0,
        completed_sessions INTEGER NOT NULL DEFAULT 0,
        abandoned_sessions INTEGER NOT NULL DEFAULT 0,

        -- Time tracking
        total_focus_minutes INTEGER NOT NULL DEFAULT 0,
        total_break_minutes INTEGER NOT NULL DEFAULT 0,

        -- Pomodoro stats
        total_pomodoros INTEGER NOT NULL DEFAULT 0,

        -- Quality metrics
        avg_productivity_score INTEGER,
        avg_focus_quality TEXT,

        -- Streak tracking
        current_streak_days INTEGER NOT NULL DEFAULT 0,
        longest_streak_days INTEGER NOT NULL DEFAULT 0,

        -- Implementation correlation
        implementations_during_focus INTEGER NOT NULL DEFAULT 0,
        ideas_generated_during_focus INTEGER NOT NULL DEFAULT 0,

        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),

        UNIQUE(project_id, date)
      )
    `, logger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_focus_stats_project ON focus_stats(project_id);
        CREATE INDEX idx_focus_stats_date ON focus_stats(date DESC);
        CREATE INDEX idx_focus_stats_project_date ON focus_stats(project_id, date DESC);
      `);
      logger.info('focus_stats table created successfully');
    }
  }, logger);

  logger.success('Focus mode tables migration completed');
}
