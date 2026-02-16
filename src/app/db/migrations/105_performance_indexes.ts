/**
 * Migration 105: Add composite indexes for performance
 *
 * Adds indexes that support date-range filtered queries used by
 * predictiveStandupEngine and standup.repository getSummaryStats.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate105PerformanceIndexes(
  db: { exec: (sql: string) => void },
  logger: MigrationLogger
): void {
  // Index for implementation_log date-range queries by project
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_implementation_log_project_created
    ON implementation_log (project_id, created_at)
  `);

  // Index for ideas date-range + status queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ideas_project_status_created
    ON ideas (project_id, status, created_at)
  `);

  // Index for goal_signals by goal + date (used by assessGoalRisks)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_goal_signals_goal_created
    ON goal_signals (goal_id, created_at)
  `);

  // Index for standup_summaries period lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_standup_summaries_project_period
    ON standup_summaries (project_id, period_type, period_start)
  `);

  // Index for behavioral_signals type + date range queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_behavioral_signals_project_type_timestamp
    ON behavioral_signals (project_id, signal_type, timestamp)
  `);

  logger.info('Migration 105: Added composite performance indexes');
}
