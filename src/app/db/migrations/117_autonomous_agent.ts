/**
 * Migration 117: Autonomous Agent Mode
 * Goal-driven execution with step decomposition and cross-session persistence
 */

import { MigrationLogger } from './migration.utils';

export function migrate117AutonomousAgent(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  logger.info('Running migration 117: Autonomous Agent Mode');

  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_goals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      objective TEXT NOT NULL,
      strategy TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      total_steps INTEGER NOT NULL DEFAULT 0,
      completed_steps INTEGER NOT NULL DEFAULT 0,
      failed_steps INTEGER NOT NULL DEFAULT 0,
      current_step_id TEXT,
      result_summary TEXT,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_goals_project ON agent_goals(project_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_goals_status ON agent_goals(status)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_steps (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      tool_name TEXT,
      tool_input TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      result TEXT,
      error_message TEXT,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (goal_id) REFERENCES agent_goals(id) ON DELETE CASCADE
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_steps_goal ON agent_steps(goal_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_steps_status ON agent_steps(status)`);

  logger.success('Migration 117 complete: Autonomous Agent Mode');
}
