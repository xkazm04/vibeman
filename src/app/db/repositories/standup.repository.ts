import { getDatabase } from '../connection';
import { DbStandupSummary } from '../models/standup.types';
import { createGenericRepository } from './generic.repository';

const base = createGenericRepository<DbStandupSummary>({
  tableName: 'standup_summaries',
  defaultOrder: 'period_start DESC',
  excludeUpdateFields: ['id', 'project_id', 'period_type', 'period_start', 'created_at'],
});

/**
 * Standup Summary Repository
 * Handles all database operations for daily/weekly standup summaries
 */
export const standupRepository = {
  /**
   * Get all standup summaries for a project
   */
  getSummariesByProject: (projectId: string, limit: number = 30): DbStandupSummary[] =>
    base.getByProject(projectId, limit),

  /**
   * Get standup summary by ID
   */
  getSummaryById: (id: string): DbStandupSummary | null => base.getById(id),

  /**
   * Get standup summary for a specific period
   */
  getSummaryByPeriod: (
    projectId: string,
    periodType: 'daily' | 'weekly',
    periodStart: string
  ): DbStandupSummary | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM standup_summaries
      WHERE project_id = ? AND period_type = ? AND period_start = ?
    `);
    const summary = stmt.get(projectId, periodType, periodStart) as DbStandupSummary | undefined;
    return summary || null;
  },

  /**
   * Get recent daily summaries
   */
  getRecentDailySummaries: (projectId: string, days: number = 7): DbStandupSummary[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM standup_summaries
      WHERE project_id = ? AND period_type = 'daily'
      ORDER BY period_start DESC
      LIMIT ?
    `);
    return stmt.all(projectId, days) as DbStandupSummary[];
  },

  /**
   * Get recent weekly summaries
   */
  getRecentWeeklySummaries: (projectId: string, weeks: number = 4): DbStandupSummary[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM standup_summaries
      WHERE project_id = ? AND period_type = 'weekly'
      ORDER BY period_start DESC
      LIMIT ?
    `);
    return stmt.all(projectId, weeks) as DbStandupSummary[];
  },

  /**
   * Update an existing standup summary (for regeneration)
   */
  updateSummary: (
    id: string,
    updates: Partial<Omit<DbStandupSummary, 'id' | 'project_id' | 'period_type' | 'period_start' | 'created_at'>>
  ): DbStandupSummary | null => base.update(id, updates as Record<string, unknown>),

  /**
   * Upsert a standup summary (create or update).
   * Uses atomic INSERT ... ON CONFLICT to avoid read-then-write races.
   */
  upsertSummary: (summary: Omit<DbStandupSummary, 'created_at' | 'updated_at'>): DbStandupSummary => {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO standup_summaries (
        id, project_id, period_type, period_start, period_end,
        title, summary,
        implementations_count, ideas_generated, ideas_accepted, ideas_rejected, ideas_implemented, scans_count,
        blockers, highlights,
        velocity_trend, burnout_risk, focus_areas,
        input_tokens, output_tokens,
        generated_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, period_type, period_start) DO UPDATE SET
        period_end = excluded.period_end,
        title = excluded.title,
        summary = excluded.summary,
        implementations_count = excluded.implementations_count,
        ideas_generated = excluded.ideas_generated,
        ideas_accepted = excluded.ideas_accepted,
        ideas_rejected = excluded.ideas_rejected,
        ideas_implemented = excluded.ideas_implemented,
        scans_count = excluded.scans_count,
        blockers = excluded.blockers,
        highlights = excluded.highlights,
        velocity_trend = excluded.velocity_trend,
        burnout_risk = excluded.burnout_risk,
        focus_areas = excluded.focus_areas,
        input_tokens = excluded.input_tokens,
        output_tokens = excluded.output_tokens,
        generated_at = excluded.generated_at,
        updated_at = excluded.updated_at
    `).run(
      summary.id,
      summary.project_id,
      summary.period_type,
      summary.period_start,
      summary.period_end,
      summary.title,
      summary.summary,
      summary.implementations_count,
      summary.ideas_generated,
      summary.ideas_accepted,
      summary.ideas_rejected,
      summary.ideas_implemented,
      summary.scans_count,
      summary.blockers,
      summary.highlights,
      summary.velocity_trend,
      summary.burnout_risk,
      summary.focus_areas,
      summary.input_tokens,
      summary.output_tokens,
      summary.generated_at,
      now,
      now
    );

    // On conflict the original id is kept; fetch by the natural key to handle both paths
    return (
      standupRepository.getSummaryByPeriod(summary.project_id, summary.period_type, summary.period_start) ??
      base.getById(summary.id)!
    );
  },

  /**
   * Delete a standup summary
   */
  deleteSummary: (id: string): boolean => base.deleteById(id),

};
