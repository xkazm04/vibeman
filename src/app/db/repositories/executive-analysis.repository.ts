/**
 * Executive Analysis Repository
 * Handles CRUD operations for AI-driven executive insight analysis sessions
 */

import { getDatabase } from '../connection';
import type {
  DbExecutiveAnalysis,
  CreateExecutiveAnalysisInput,
  CompleteExecutiveAnalysisData,
  ExecutiveAIInsight,
} from '../models/reflector.types';
import { getCurrentTimestamp, selectOne, selectAll } from './repository.utils';

export const executiveAnalysisRepository = {
  /**
   * Create a new analysis session
   */
  create: (input: CreateExecutiveAnalysisInput): DbExecutiveAnalysis => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO executive_analysis (
        id, project_id, context_id, status, trigger_type, time_window, created_at
      )
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
    `);

    stmt.run(
      input.id,
      input.project_id,
      input.context_id,
      input.trigger_type,
      input.time_window,
      now
    );

    return selectOne<DbExecutiveAnalysis>(
      db,
      'SELECT * FROM executive_analysis WHERE id = ?',
      input.id
    )!;
  },

  /**
   * Get analysis by ID
   */
  getById: (id: string): DbExecutiveAnalysis | null => {
    const db = getDatabase();
    return selectOne<DbExecutiveAnalysis>(
      db,
      'SELECT * FROM executive_analysis WHERE id = ?',
      id
    );
  },

  /**
   * Get latest analysis for a project (null = global)
   */
  getLatest: (projectId: string | null): DbExecutiveAnalysis | null => {
    const db = getDatabase();
    if (projectId === null) {
      return selectOne<DbExecutiveAnalysis>(
        db,
        `SELECT * FROM executive_analysis
         WHERE project_id IS NULL
         ORDER BY created_at DESC
         LIMIT 1`
      );
    }
    return selectOne<DbExecutiveAnalysis>(
      db,
      `SELECT * FROM executive_analysis
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      projectId
    );
  },

  /**
   * Get latest completed analysis for a project
   */
  getLatestCompleted: (projectId: string | null): DbExecutiveAnalysis | null => {
    const db = getDatabase();
    if (projectId === null) {
      return selectOne<DbExecutiveAnalysis>(
        db,
        `SELECT * FROM executive_analysis
         WHERE project_id IS NULL AND status = 'completed'
         ORDER BY completed_at DESC
         LIMIT 1`
      );
    }
    return selectOne<DbExecutiveAnalysis>(
      db,
      `SELECT * FROM executive_analysis
       WHERE project_id = ? AND status = 'completed'
       ORDER BY completed_at DESC
       LIMIT 1`,
      projectId
    );
  },

  /**
   * Get running analysis for a project (should be 0 or 1)
   */
  getRunning: (projectId: string | null): DbExecutiveAnalysis | null => {
    const db = getDatabase();
    if (projectId === null) {
      return selectOne<DbExecutiveAnalysis>(
        db,
        `SELECT * FROM executive_analysis
         WHERE project_id IS NULL AND status = 'running'
         ORDER BY started_at DESC
         LIMIT 1`
      );
    }
    return selectOne<DbExecutiveAnalysis>(
      db,
      `SELECT * FROM executive_analysis
       WHERE project_id = ? AND status = 'running'
       ORDER BY started_at DESC
       LIMIT 1`,
      projectId
    );
  },

  /**
   * Check if analysis is allowed (respects minimum gap)
   */
  canAnalyze: (projectId: string | null, minGapHours: number = 1): boolean => {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - minGapHours * 60 * 60 * 1000).toISOString();

    let recent;
    if (projectId === null) {
      recent = selectOne<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM executive_analysis
         WHERE project_id IS NULL AND status IN ('completed', 'running') AND created_at >= ?`,
        cutoff
      );
    } else {
      recent = selectOne<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM executive_analysis
         WHERE project_id = ? AND status IN ('completed', 'running') AND created_at >= ?`,
        projectId,
        cutoff
      );
    }

    return (recent?.count ?? 0) === 0;
  },

  /**
   * Update analysis status to running
   */
  startAnalysis: (id: string): DbExecutiveAnalysis | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE executive_analysis
      SET status = 'running', started_at = ?
      WHERE id = ?
    `);

    stmt.run(now, id);

    return selectOne<DbExecutiveAnalysis>(
      db,
      'SELECT * FROM executive_analysis WHERE id = ?',
      id
    );
  },

  /**
   * Update analysis with completion results
   */
  completeAnalysis: (
    id: string,
    data: CompleteExecutiveAnalysisData
  ): DbExecutiveAnalysis | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE executive_analysis
      SET status = 'completed',
          completed_at = ?,
          ideas_analyzed = ?,
          directions_analyzed = ?,
          ai_insights = ?,
          ai_narrative = ?,
          ai_recommendations = ?
      WHERE id = ?
    `);

    stmt.run(
      now,
      data.ideasAnalyzed,
      data.directionsAnalyzed,
      JSON.stringify(data.insights),
      data.narrative,
      JSON.stringify(data.recommendations),
      id
    );

    return selectOne<DbExecutiveAnalysis>(
      db,
      'SELECT * FROM executive_analysis WHERE id = ?',
      id
    );
  },

  /**
   * Mark analysis as failed
   */
  failAnalysis: (id: string, errorMessage: string): DbExecutiveAnalysis | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE executive_analysis
      SET status = 'failed',
          completed_at = ?,
          error_message = ?
      WHERE id = ?
    `);

    stmt.run(now, errorMessage, id);

    return selectOne<DbExecutiveAnalysis>(
      db,
      'SELECT * FROM executive_analysis WHERE id = ?',
      id
    );
  },

  /**
   * Get analysis history for a project
   */
  getHistory: (projectId: string | null, limit: number = 10): DbExecutiveAnalysis[] => {
    const db = getDatabase();
    if (projectId === null) {
      return selectAll<DbExecutiveAnalysis>(
        db,
        `SELECT * FROM executive_analysis
         WHERE project_id IS NULL
         ORDER BY created_at DESC
         LIMIT ?`,
        limit
      );
    }
    return selectAll<DbExecutiveAnalysis>(
      db,
      `SELECT * FROM executive_analysis
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      projectId,
      limit
    );
  },

  /**
   * Get all insights from completed analyses for a project
   */
  getAllInsights: (projectId: string | null, limit: number = 20): ExecutiveAIInsight[] => {
    const db = getDatabase();
    let rows;
    if (projectId === null) {
      rows = selectAll<{ ai_insights: string }>(
        db,
        `SELECT ai_insights FROM executive_analysis
         WHERE project_id IS NULL AND status = 'completed' AND ai_insights IS NOT NULL
         ORDER BY completed_at DESC
         LIMIT ?`,
        limit
      );
    } else {
      rows = selectAll<{ ai_insights: string }>(
        db,
        `SELECT ai_insights FROM executive_analysis
         WHERE project_id = ? AND status = 'completed' AND ai_insights IS NOT NULL
         ORDER BY completed_at DESC
         LIMIT ?`,
        projectId,
        limit
      );
    }

    const all: ExecutiveAIInsight[] = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.ai_insights);
        if (Array.isArray(parsed)) all.push(...parsed);
      } catch { /* skip corrupted rows */ }
    }
    return all;
  },

  /**
   * Delete analysis by ID
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM executive_analysis WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Clean up old failed/pending analyses
   */
  cleanupStale: (olderThanDays: number = 7): number => {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      DELETE FROM executive_analysis
      WHERE status IN ('failed', 'pending') AND created_at < ?
    `);

    const result = stmt.run(cutoff);
    return result.changes;
  },
};
