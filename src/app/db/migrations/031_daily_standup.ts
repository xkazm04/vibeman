/**
 * Migration 031: Daily Standup Tables
 *
 * Creates tables for:
 * - standup_summaries: AI-generated daily/weekly standup reports
 */

import { getConnection } from '../drivers';
import { createTableIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';

export function migrateDailyStandupTables(logger: MigrationLogger) {
  const db = getConnection();

  // Create standup_summaries table
  safeMigration('standupSummariesTable', () => {
    const created = createTableIfNotExists(db, 'standup_summaries', `
      CREATE TABLE standup_summaries (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly')),
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,

        -- Summary content
        title TEXT NOT NULL,
        summary TEXT NOT NULL,

        -- Stats
        implementations_count INTEGER NOT NULL DEFAULT 0,
        ideas_generated INTEGER NOT NULL DEFAULT 0,
        ideas_accepted INTEGER NOT NULL DEFAULT 0,
        ideas_rejected INTEGER NOT NULL DEFAULT 0,
        ideas_implemented INTEGER NOT NULL DEFAULT 0,
        scans_count INTEGER NOT NULL DEFAULT 0,

        -- Blockers and highlights
        blockers TEXT,
        highlights TEXT,

        -- AI-detected patterns
        velocity_trend TEXT CHECK (velocity_trend IN ('increasing', 'stable', 'decreasing')),
        burnout_risk TEXT CHECK (burnout_risk IN ('low', 'medium', 'high')),
        focus_areas TEXT,

        -- Token tracking
        input_tokens INTEGER,
        output_tokens INTEGER,

        -- Metadata
        generated_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),

        UNIQUE(project_id, period_type, period_start)
      )
    `, logger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_standup_summaries_project ON standup_summaries(project_id);
        CREATE INDEX idx_standup_summaries_period_type ON standup_summaries(period_type);
        CREATE INDEX idx_standup_summaries_period_start ON standup_summaries(period_start);
        CREATE INDEX idx_standup_summaries_generated_at ON standup_summaries(generated_at DESC);
      `);
      logger.info('standup_summaries table created successfully');
    }
  }, logger);

  logger.success('Daily standup tables migration completed');
}
