/**
 * Brain Reflection Repository
 * Handles CRUD operations for autonomous reflection sessions
 */

import { getDatabase } from '../connection';
import type {
  DbBrainReflection,
  ReflectionStatus,
  ReflectionTriggerType,
  CreateBrainReflectionInput,
  LearningInsight,
} from '../models/brain.types';
import { getCurrentTimestamp, selectOne, selectAll } from './repository.utils';

export const brainReflectionRepository = {
  /**
   * Create a new reflection session
   */
  create: (input: CreateBrainReflectionInput): DbBrainReflection => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO brain_reflections (
        id, project_id, status, trigger_type, scope, created_at
      )
      VALUES (?, ?, 'pending', ?, ?, ?)
    `);

    stmt.run(input.id, input.project_id, input.trigger_type, input.scope || 'project', now);

    return selectOne<DbBrainReflection>(
      db,
      'SELECT * FROM brain_reflections WHERE id = ?',
      input.id
    )!;
  },

  /**
   * Get reflection by ID
   */
  getById: (id: string): DbBrainReflection | null => {
    const db = getDatabase();
    return selectOne<DbBrainReflection>(
      db,
      'SELECT * FROM brain_reflections WHERE id = ?',
      id
    );
  },

  /**
   * Get latest reflection for a project
   */
  getLatest: (projectId: string): DbBrainReflection | null => {
    const db = getDatabase();
    return selectOne<DbBrainReflection>(
      db,
      `SELECT * FROM brain_reflections
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      projectId
    );
  },

  /**
   * Get latest completed reflection for a project
   */
  getLatestCompleted: (projectId: string): DbBrainReflection | null => {
    const db = getDatabase();
    return selectOne<DbBrainReflection>(
      db,
      `SELECT * FROM brain_reflections
       WHERE project_id = ? AND status = 'completed'
       ORDER BY completed_at DESC
       LIMIT 1`,
      projectId
    );
  },

  /**
   * Get reflections by project
   */
  getByProject: (projectId: string, limit: number = 10): DbBrainReflection[] => {
    const db = getDatabase();
    return selectAll<DbBrainReflection>(
      db,
      `SELECT * FROM brain_reflections
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      projectId,
      limit
    );
  },

  /**
   * Get running reflections (should normally be 0 or 1)
   */
  getRunning: (projectId: string): DbBrainReflection | null => {
    const db = getDatabase();
    return selectOne<DbBrainReflection>(
      db,
      `SELECT * FROM brain_reflections
       WHERE project_id = ? AND status = 'running'
       ORDER BY started_at DESC
       LIMIT 1`,
      projectId
    );
  },

  /**
   * Check if reflection is allowed (respects minimum gap)
   */
  canReflect: (projectId: string, minGapHours: number = 24): boolean => {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - minGapHours * 60 * 60 * 1000).toISOString();

    const recent = selectOne<{ count: number }>(
      db,
      `SELECT COUNT(*) as count FROM brain_reflections
       WHERE project_id = ? AND status IN ('completed', 'running') AND created_at >= ?`,
      projectId,
      cutoff
    );

    return (recent?.count ?? 0) === 0;
  },

  /**
   * Update reflection status to running
   */
  startReflection: (id: string): DbBrainReflection | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE brain_reflections
      SET status = 'running', started_at = ?
      WHERE id = ?
    `);

    stmt.run(now, id);

    return selectOne<DbBrainReflection>(
      db,
      'SELECT * FROM brain_reflections WHERE id = ?',
      id
    );
  },

  /**
   * Update reflection with completion results
   */
  completeReflection: (
    id: string,
    data: {
      directions_analyzed: number;
      outcomes_analyzed: number;
      signals_analyzed: number;
      insights_generated: LearningInsight[];
      guide_sections_updated: string[];
    }
  ): DbBrainReflection | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE brain_reflections
      SET status = 'completed',
          completed_at = ?,
          directions_analyzed = ?,
          outcomes_analyzed = ?,
          signals_analyzed = ?,
          insights_generated = ?,
          guide_sections_updated = ?
      WHERE id = ?
    `);

    stmt.run(
      now,
      data.directions_analyzed,
      data.outcomes_analyzed,
      data.signals_analyzed,
      JSON.stringify(data.insights_generated),
      JSON.stringify(data.guide_sections_updated),
      id
    );

    return selectOne<DbBrainReflection>(
      db,
      'SELECT * FROM brain_reflections WHERE id = ?',
      id
    );
  },

  /**
   * Mark reflection as failed
   */
  failReflection: (id: string, errorMessage: string): DbBrainReflection | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE brain_reflections
      SET status = 'failed',
          completed_at = ?,
          error_message = ?
      WHERE id = ?
    `);

    stmt.run(now, errorMessage, id);

    return selectOne<DbBrainReflection>(
      db,
      'SELECT * FROM brain_reflections WHERE id = ?',
      id
    );
  },

  /**
   * Get reflection statistics
   */
  getStats: (projectId: string): {
    total: number;
    completed: number;
    failed: number;
    lastReflection: string | null;
    totalInsights: number;
  } => {
    const db = getDatabase();

    const counts = selectOne<{
      total: number;
      completed: number;
      failed: number;
    }>(
      db,
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM brain_reflections
       WHERE project_id = ?`,
      projectId
    );

    const latest = selectOne<{ completed_at: string | null }>(
      db,
      `SELECT completed_at FROM brain_reflections
       WHERE project_id = ? AND status = 'completed'
       ORDER BY completed_at DESC LIMIT 1`,
      projectId
    );

    // Count total insights across all reflections
    const insights = selectOne<{ total: number }>(
      db,
      `SELECT SUM(json_array_length(insights_generated)) as total
       FROM brain_reflections
       WHERE project_id = ? AND insights_generated IS NOT NULL`,
      projectId
    );

    return {
      total: counts?.total ?? 0,
      completed: counts?.completed ?? 0,
      failed: counts?.failed ?? 0,
      lastReflection: latest?.completed_at ?? null,
      totalInsights: insights?.total ?? 0,
    };
  },

  /**
   * Delete reflection by ID
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM brain_reflections WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete reflections by project
   */
  deleteByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM brain_reflections WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Clean up old failed/pending reflections
   */
  cleanupStale: (olderThanDays: number = 7): number => {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      DELETE FROM brain_reflections
      WHERE status IN ('failed', 'pending') AND created_at < ?
    `);

    const result = stmt.run(cutoff);
    return result.changes;
  },

  /**
   * Get all insights from completed reflections for a project
   * Used to prevent duplicate insight generation
   */
  getAllInsights: (projectId: string, limit: number = 20): LearningInsight[] => {
    const db = getDatabase();
    const rows = selectAll<{ insights_generated: string }>(
      db,
      `SELECT insights_generated FROM brain_reflections
       WHERE project_id = ? AND status = 'completed' AND insights_generated IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT ?`,
      projectId,
      limit
    );

    const all: LearningInsight[] = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.insights_generated);
        if (Array.isArray(parsed)) all.push(...parsed);
      } catch { /* skip corrupted rows */ }
    }
    return all;
  },

  /**
   * Get all insights from completed reflections across all projects (global)
   */
  getAllInsightsGlobal: (limit: number = 30): Array<LearningInsight & { project_id: string }> => {
    const db = getDatabase();
    const rows = selectAll<{ insights_generated: string; project_id: string }>(
      db,
      `SELECT insights_generated, project_id FROM brain_reflections
       WHERE status = 'completed' AND insights_generated IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT ?`,
      limit
    );

    const all: Array<LearningInsight & { project_id: string }> = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.insights_generated);
        if (Array.isArray(parsed)) {
          for (const insight of parsed) {
            all.push({ ...insight, project_id: row.project_id });
          }
        }
      } catch { /* skip corrupted rows */ }
    }
    return all;
  },

  /**
   * Get running global reflection (scope = 'global')
   */
  getRunningGlobal: (): DbBrainReflection | null => {
    const db = getDatabase();
    return selectOne<DbBrainReflection>(
      db,
      `SELECT * FROM brain_reflections
       WHERE scope = 'global' AND status = 'running'
       ORDER BY started_at DESC
       LIMIT 1`
    );
  },

  /**
   * Get latest completed global reflection
   */
  getLatestCompletedGlobal: (): DbBrainReflection | null => {
    const db = getDatabase();
    return selectOne<DbBrainReflection>(
      db,
      `SELECT * FROM brain_reflections
       WHERE scope = 'global' AND status = 'completed'
       ORDER BY completed_at DESC
       LIMIT 1`
    );
  },

  /**
   * Update insights_generated JSON for a reflection (used for deletion)
   */
  updateInsights: (reflectionId: string, insightsJson: string): void => {
    const db = getDatabase();
    db.prepare(
      `UPDATE brain_reflections SET insights_generated = ? WHERE id = ?`
    ).run(insightsJson, reflectionId);
  },
};
