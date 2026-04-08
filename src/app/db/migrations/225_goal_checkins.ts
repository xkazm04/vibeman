/**
 * Migration 225: Goal Check-ins Table
 *
 * Creates the goal_checkins table for weekly confidence check-ins.
 * Users rate confidence 1-5 per active goal and optionally add a note.
 * Plotted as sparklines on goal cards and fed into standup predictions.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate225GoalCheckins(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_checkins (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        confidence INTEGER NOT NULL CHECK (confidence >= 1 AND confidence <= 5),
        note TEXT,
        week_of TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_goal_checkins_goal_id ON goal_checkins(goal_id);
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_goal_checkins_project_id ON goal_checkins(project_id);
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_goal_checkins_week ON goal_checkins(goal_id, week_of);
    `);
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_goal_checkins_unique_week ON goal_checkins(goal_id, week_of);
    `);

    logger.info('[Migration 225] goal_checkins table created successfully');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
    logger.info('[Migration 225] goal_checkins table already exists');
  }
}
