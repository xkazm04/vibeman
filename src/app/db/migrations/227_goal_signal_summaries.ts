/**
 * Migration 227: Goal Signal Summaries (Incremental Signal Graph)
 *
 * Creates a materialized summary table (goal_signal_summaries) that stores
 * per-goal signal aggregates (count, last_signal_at, velocity windows, risk).
 * Updated incrementally via SQLite triggers on goal_signals INSERT/DELETE,
 * eliminating the N+1 query pattern in standup generation.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate227GoalSignalSummaries(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  // 1. Create the materialized summary table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_signal_summaries (
        goal_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        signal_count INTEGER NOT NULL DEFAULT 0,
        last_signal_at TEXT,
        velocity_7d INTEGER NOT NULL DEFAULT 0,
        velocity_14d INTEGER NOT NULL DEFAULT 0,
        risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
      )
    `);
    logger.info('[Migration 227] Created goal_signal_summaries table');
  } catch (e: any) {
    logger.info('[Migration 227] goal_signal_summaries table may already exist');
  }

  // 2. Indexes for efficient lookup
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_goal_signal_summaries_project ON goal_signal_summaries(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_goal_signal_summaries_risk ON goal_signal_summaries(risk_level, project_id)`,
  ];

  for (const idx of indexes) {
    try {
      db.prepare(idx).run();
    } catch {
      // Index might already exist
    }
  }

  // 3. Trigger: on INSERT into goal_signals, upsert summary row
  try {
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_goal_signal_summary_insert
      AFTER INSERT ON goal_signals
      BEGIN
        INSERT INTO goal_signal_summaries (goal_id, project_id, signal_count, last_signal_at, velocity_7d, velocity_14d, updated_at)
        VALUES (
          NEW.goal_id,
          NEW.project_id,
          1,
          NEW.created_at,
          CASE WHEN NEW.created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END,
          CASE WHEN NEW.created_at >= datetime('now', '-14 days') THEN 1 ELSE 0 END,
          datetime('now')
        )
        ON CONFLICT(goal_id) DO UPDATE SET
          signal_count = signal_count + 1,
          last_signal_at = CASE
            WHEN NEW.created_at > COALESCE(goal_signal_summaries.last_signal_at, '')
            THEN NEW.created_at
            ELSE goal_signal_summaries.last_signal_at
          END,
          velocity_7d = (
            SELECT COUNT(*) FROM goal_signals
            WHERE goal_id = NEW.goal_id AND created_at >= datetime('now', '-7 days')
          ),
          velocity_14d = (
            SELECT COUNT(*) FROM goal_signals
            WHERE goal_id = NEW.goal_id AND created_at >= datetime('now', '-14 days')
          ),
          risk_level = CASE
            WHEN (SELECT COUNT(*) FROM goal_signals WHERE goal_id = NEW.goal_id AND created_at >= datetime('now', '-7 days')) = 0
            THEN 'high'
            WHEN (SELECT COUNT(*) FROM goal_signals WHERE goal_id = NEW.goal_id AND created_at >= datetime('now', '-7 days')) <= 2
            THEN 'medium'
            ELSE 'low'
          END,
          updated_at = datetime('now');
      END
    `);
    logger.info('[Migration 227] Created INSERT trigger for goal_signal_summaries');
  } catch (e: any) {
    logger.info('[Migration 227] INSERT trigger may already exist');
  }

  // 4. Trigger: on DELETE from goal_signals, update summary row
  try {
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_goal_signal_summary_delete
      AFTER DELETE ON goal_signals
      BEGIN
        UPDATE goal_signal_summaries SET
          signal_count = MAX(0, signal_count - 1),
          last_signal_at = (
            SELECT MAX(created_at) FROM goal_signals WHERE goal_id = OLD.goal_id
          ),
          velocity_7d = (
            SELECT COUNT(*) FROM goal_signals
            WHERE goal_id = OLD.goal_id AND created_at >= datetime('now', '-7 days')
          ),
          velocity_14d = (
            SELECT COUNT(*) FROM goal_signals
            WHERE goal_id = OLD.goal_id AND created_at >= datetime('now', '-14 days')
          ),
          risk_level = CASE
            WHEN (SELECT COUNT(*) FROM goal_signals WHERE goal_id = OLD.goal_id AND created_at >= datetime('now', '-7 days')) = 0
            THEN 'high'
            WHEN (SELECT COUNT(*) FROM goal_signals WHERE goal_id = OLD.goal_id AND created_at >= datetime('now', '-7 days')) <= 2
            THEN 'medium'
            ELSE 'low'
          END,
          updated_at = datetime('now')
        WHERE goal_id = OLD.goal_id;
      END
    `);
    logger.info('[Migration 227] Created DELETE trigger for goal_signal_summaries');
  } catch (e: any) {
    logger.info('[Migration 227] DELETE trigger may already exist');
  }

  // 5. Backfill: populate summaries from existing goal_signals data
  try {
    db.exec(`
      INSERT OR REPLACE INTO goal_signal_summaries (goal_id, project_id, signal_count, last_signal_at, velocity_7d, velocity_14d, risk_level, updated_at)
      SELECT
        gs.goal_id,
        gs.project_id,
        COUNT(*) as signal_count,
        MAX(gs.created_at) as last_signal_at,
        SUM(CASE WHEN gs.created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as velocity_7d,
        SUM(CASE WHEN gs.created_at >= datetime('now', '-14 days') THEN 1 ELSE 0 END) as velocity_14d,
        CASE
          WHEN SUM(CASE WHEN gs.created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) = 0 THEN 'high'
          WHEN SUM(CASE WHEN gs.created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) <= 2 THEN 'medium'
          ELSE 'low'
        END as risk_level,
        datetime('now') as updated_at
      FROM goal_signals gs
      GROUP BY gs.goal_id
    `);
    logger.info('[Migration 227] Backfilled goal_signal_summaries from existing data');
  } catch (e: any) {
    logger.error('[Migration 227] Backfill failed', e);
  }

  logger.info('[Migration 227] Goal signal summaries migration complete');
}
