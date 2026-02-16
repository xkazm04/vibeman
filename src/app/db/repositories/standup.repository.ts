import { getDatabase } from '../connection';
import { DbStandupSummary } from '../models/standup.types';
import { buildUpdateStatement } from './repository.utils';

/**
 * Standup Summary Repository
 * Handles all database operations for daily/weekly standup summaries
 */
export const standupRepository = {
  /**
   * Get all standup summaries for a project
   */
  getSummariesByProject: (projectId: string, limit: number = 30): DbStandupSummary[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM standup_summaries
      WHERE project_id = ?
      ORDER BY period_start DESC
      LIMIT ?
    `);
    return stmt.all(projectId, limit) as DbStandupSummary[];
  },

  /**
   * Get standup summary by ID
   */
  getSummaryById: (id: string): DbStandupSummary | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM standup_summaries WHERE id = ?');
    const summary = stmt.get(id) as DbStandupSummary | undefined;
    return summary || null;
  },

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
  ): DbStandupSummary | null => {
    const db = getDatabase();

    const result = buildUpdateStatement(
      db,
      'standup_summaries',
      updates as Record<string, unknown>,
      'id',
      ['id', 'project_id', 'period_type', 'period_start', 'created_at', 'updated_at'],
    );

    if (result) {
      result.stmt.run(...result.values, id);
    }

    const selectStmt = db.prepare('SELECT * FROM standup_summaries WHERE id = ?');
    return selectStmt.get(id) as DbStandupSummary | null;
  },

  /**
   * Upsert a standup summary (create or update)
   */
  upsertSummary: (summary: Omit<DbStandupSummary, 'created_at' | 'updated_at'>): DbStandupSummary => {
    const existing = standupRepository.getSummaryByPeriod(
      summary.project_id,
      summary.period_type,
      summary.period_start
    );

    if (existing) {
      return standupRepository.updateSummary(existing.id, {
        period_end: summary.period_end,
        title: summary.title,
        summary: summary.summary,
        implementations_count: summary.implementations_count,
        ideas_generated: summary.ideas_generated,
        ideas_accepted: summary.ideas_accepted,
        ideas_rejected: summary.ideas_rejected,
        ideas_implemented: summary.ideas_implemented,
        scans_count: summary.scans_count,
        blockers: summary.blockers,
        highlights: summary.highlights,
        velocity_trend: summary.velocity_trend,
        burnout_risk: summary.burnout_risk,
        focus_areas: summary.focus_areas,
        input_tokens: summary.input_tokens,
        output_tokens: summary.output_tokens,
        generated_at: summary.generated_at,
      })!;
    }

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

    return db.prepare('SELECT * FROM standup_summaries WHERE id = ?').get(summary.id) as DbStandupSummary;
  },

  /**
   * Delete a standup summary
   */
  deleteSummary: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM standup_summaries WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

};
