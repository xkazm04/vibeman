import { getDatabase } from '../connection';
import { DbStandupSummary } from '../models/standup.types';

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
   * Get latest standup summary for a project
   */
  getLatestSummary: (projectId: string, periodType?: 'daily' | 'weekly'): DbStandupSummary | null => {
    const db = getDatabase();
    let query = `
      SELECT * FROM standup_summaries
      WHERE project_id = ?
    `;
    if (periodType) {
      query += ` AND period_type = ?`;
    }
    query += ` ORDER BY period_start DESC LIMIT 1`;

    const stmt = db.prepare(query);
    const summary = periodType
      ? stmt.get(projectId, periodType) as DbStandupSummary | undefined
      : stmt.get(projectId) as DbStandupSummary | undefined;
    return summary || null;
  },

  /**
   * Create a new standup summary
   */
  createSummary: (summary: Omit<DbStandupSummary, 'created_at' | 'updated_at'>): DbStandupSummary => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
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
    `);

    stmt.run(
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

    const selectStmt = db.prepare('SELECT * FROM standup_summaries WHERE id = ?');
    return selectStmt.get(summary.id) as DbStandupSummary;
  },

  /**
   * Update an existing standup summary (for regeneration)
   */
  updateSummary: (
    id: string,
    updates: Partial<Omit<DbStandupSummary, 'id' | 'project_id' | 'period_type' | 'period_start' | 'created_at'>>
  ): DbStandupSummary | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateFields: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.period_end !== undefined) {
      updateFields.push('period_end = ?');
      values.push(updates.period_end);
    }
    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.summary !== undefined) {
      updateFields.push('summary = ?');
      values.push(updates.summary);
    }
    if (updates.implementations_count !== undefined) {
      updateFields.push('implementations_count = ?');
      values.push(updates.implementations_count);
    }
    if (updates.ideas_generated !== undefined) {
      updateFields.push('ideas_generated = ?');
      values.push(updates.ideas_generated);
    }
    if (updates.ideas_accepted !== undefined) {
      updateFields.push('ideas_accepted = ?');
      values.push(updates.ideas_accepted);
    }
    if (updates.ideas_rejected !== undefined) {
      updateFields.push('ideas_rejected = ?');
      values.push(updates.ideas_rejected);
    }
    if (updates.ideas_implemented !== undefined) {
      updateFields.push('ideas_implemented = ?');
      values.push(updates.ideas_implemented);
    }
    if (updates.scans_count !== undefined) {
      updateFields.push('scans_count = ?');
      values.push(updates.scans_count);
    }
    if (updates.blockers !== undefined) {
      updateFields.push('blockers = ?');
      values.push(updates.blockers);
    }
    if (updates.highlights !== undefined) {
      updateFields.push('highlights = ?');
      values.push(updates.highlights);
    }
    if (updates.velocity_trend !== undefined) {
      updateFields.push('velocity_trend = ?');
      values.push(updates.velocity_trend);
    }
    if (updates.burnout_risk !== undefined) {
      updateFields.push('burnout_risk = ?');
      values.push(updates.burnout_risk);
    }
    if (updates.focus_areas !== undefined) {
      updateFields.push('focus_areas = ?');
      values.push(updates.focus_areas);
    }
    if (updates.input_tokens !== undefined) {
      updateFields.push('input_tokens = ?');
      values.push(updates.input_tokens);
    }
    if (updates.output_tokens !== undefined) {
      updateFields.push('output_tokens = ?');
      values.push(updates.output_tokens);
    }
    if (updates.generated_at !== undefined) {
      updateFields.push('generated_at = ?');
      values.push(updates.generated_at);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE standup_summaries
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

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

    return standupRepository.createSummary(summary);
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

  /**
   * Delete all summaries for a project
   */
  deleteAllForProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM standup_summaries WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Get summary statistics for a date range
   */
  getSummaryStats: (projectId: string, startDate: string, endDate: string): {
    totalImplementations: number;
    totalIdeasGenerated: number;
    totalIdeasAccepted: number;
    totalIdeasImplemented: number;
    avgAcceptanceRate: number;
  } => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        SUM(implementations_count) as totalImplementations,
        SUM(ideas_generated) as totalIdeasGenerated,
        SUM(ideas_accepted) as totalIdeasAccepted,
        SUM(ideas_implemented) as totalIdeasImplemented,
        AVG(CASE WHEN ideas_generated > 0 THEN (ideas_accepted * 100.0 / ideas_generated) ELSE 0 END) as avgAcceptanceRate
      FROM standup_summaries
      WHERE project_id = ?
        AND period_start >= ?
        AND period_end <= ?
    `);

    const result = stmt.get(projectId, startDate, endDate) as {
      totalImplementations: number | null;
      totalIdeasGenerated: number | null;
      totalIdeasAccepted: number | null;
      totalIdeasImplemented: number | null;
      avgAcceptanceRate: number | null;
    };

    return {
      totalImplementations: result.totalImplementations || 0,
      totalIdeasGenerated: result.totalIdeasGenerated || 0,
      totalIdeasAccepted: result.totalIdeasAccepted || 0,
      totalIdeasImplemented: result.totalIdeasImplemented || 0,
      avgAcceptanceRate: Math.round(result.avgAcceptanceRate || 0),
    };
  },
};
