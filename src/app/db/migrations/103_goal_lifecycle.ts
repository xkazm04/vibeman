/**
 * Migration 103: Goal Lifecycle Engine
 *
 * Adds goal_signals table to track implementation evidence (commits, logs, scans)
 * and goal_sub_goals table for AI-decomposed sub-objectives.
 * Also adds lifecycle columns to goals table.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate103GoalLifecycle(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  // 1. Add lifecycle columns to goals table
  const goalColumns = [
    { name: 'lifecycle_status', sql: `ALTER TABLE goals ADD COLUMN lifecycle_status TEXT DEFAULT 'manual'` },
    { name: 'inferred_progress', sql: `ALTER TABLE goals ADD COLUMN inferred_progress INTEGER DEFAULT 0` },
    { name: 'last_signal_at', sql: `ALTER TABLE goals ADD COLUMN last_signal_at TEXT` },
    { name: 'auto_started_at', sql: `ALTER TABLE goals ADD COLUMN auto_started_at TEXT` },
    { name: 'auto_completed_at', sql: `ALTER TABLE goals ADD COLUMN auto_completed_at TEXT` },
    { name: 'signal_count', sql: `ALTER TABLE goals ADD COLUMN signal_count INTEGER DEFAULT 0` },
  ];

  for (const col of goalColumns) {
    try {
      db.prepare(col.sql).run();
      logger.info(`[Migration 103] Added ${col.name} column to goals`);
    } catch (e: any) {
      if (!e.message?.includes('duplicate column')) throw e;
      logger.info(`[Migration 103] ${col.name} already exists`);
    }
  }

  // 2. Create goal_signals table - tracks evidence of goal progress
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_signals (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        signal_type TEXT NOT NULL CHECK (signal_type IN (
          'implementation_log', 'requirement_completed', 'git_commit',
          'scan_completed', 'idea_implemented', 'context_updated', 'manual_update'
        )),
        source_id TEXT,
        source_title TEXT,
        description TEXT,
        progress_delta INTEGER DEFAULT 0,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
      )
    `);
    logger.info('[Migration 103] Created goal_signals table');
  } catch (e: any) {
    logger.info('[Migration 103] goal_signals table may already exist');
  }

  // 3. Create goal_sub_goals table - AI-decomposed sub-objectives
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_sub_goals (
        id TEXT PRIMARY KEY,
        parent_goal_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'skipped')),
        order_index INTEGER NOT NULL DEFAULT 0,
        progress INTEGER DEFAULT 0,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (parent_goal_id) REFERENCES goals(id) ON DELETE CASCADE
      )
    `);
    logger.info('[Migration 103] Created goal_sub_goals table');
  } catch (e: any) {
    logger.info('[Migration 103] goal_sub_goals table may already exist');
  }

  // 4. Indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_goal_signals_goal ON goal_signals(goal_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_goal_signals_project ON goal_signals(project_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_goal_signals_type ON goal_signals(signal_type, goal_id)`,
    `CREATE INDEX IF NOT EXISTS idx_goal_sub_goals_parent ON goal_sub_goals(parent_goal_id, order_index)`,
    `CREATE INDEX IF NOT EXISTS idx_goals_lifecycle ON goals(project_id, lifecycle_status)`,
  ];

  for (const idx of indexes) {
    try {
      db.prepare(idx).run();
    } catch (e: any) {
      // Index might already exist
    }
  }

  logger.info('[Migration 103] Goal lifecycle migration complete');
}
