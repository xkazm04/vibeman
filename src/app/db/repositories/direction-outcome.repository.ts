/**
 * Direction Outcome Repository
 * Handles CRUD operations for direction implementation outcomes
 */

import { getDatabase } from '../connection';
import type {
  DbDirectionOutcome,
  CreateDirectionOutcomeInput,
} from '../models/brain.types';
import { getCurrentTimestamp, selectOne, selectAll, buildUpdateQuery } from './repository.utils';

export const directionOutcomeRepository = {
  /**
   * Create a new direction outcome record
   */
  create: (input: CreateDirectionOutcomeInput): DbDirectionOutcome => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO direction_outcomes (
        id, direction_id, project_id, execution_started_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      input.id,
      input.direction_id,
      input.project_id,
      input.execution_started_at || null,
      now,
      now
    );

    return selectOne<DbDirectionOutcome>(
      db,
      'SELECT * FROM direction_outcomes WHERE id = ?',
      input.id
    )!;
  },

  /**
   * Get outcome by ID
   */
  getById: (id: string): DbDirectionOutcome | null => {
    const db = getDatabase();
    return selectOne<DbDirectionOutcome>(
      db,
      'SELECT * FROM direction_outcomes WHERE id = ?',
      id
    );
  },

  /**
   * Get outcome by direction ID
   */
  getByDirectionId: (directionId: string): DbDirectionOutcome | null => {
    const db = getDatabase();
    return selectOne<DbDirectionOutcome>(
      db,
      'SELECT * FROM direction_outcomes WHERE direction_id = ?',
      directionId
    );
  },

  /**
   * Get outcomes by project
   */
  getByProject: (
    projectId: string,
    options?: {
      limit?: number;
      successOnly?: boolean;
      revertedOnly?: boolean;
    }
  ): DbDirectionOutcome[] => {
    const db = getDatabase();
    let query = 'SELECT * FROM direction_outcomes WHERE project_id = ?';
    const params: unknown[] = [projectId];

    if (options?.successOnly) {
      query += ' AND execution_success = 1';
    }

    if (options?.revertedOnly) {
      query += ' AND was_reverted = 1';
    }

    query += ' ORDER BY created_at DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    return selectAll<DbDirectionOutcome>(db, query, ...params);
  },

  /**
   * Get recent outcomes with commit SHAs (for revert detection)
   */
  getRecentWithCommits: (projectId: string, days: number = 7): DbDirectionOutcome[] => {
    const db = getDatabase();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    return selectAll<DbDirectionOutcome>(
      db,
      `SELECT * FROM direction_outcomes
       WHERE project_id = ?
         AND commit_sha IS NOT NULL
         AND was_reverted = 0
         AND created_at >= ?
       ORDER BY created_at DESC`,
      projectId,
      since
    );
  },

  /**
   * Update outcome with execution results
   */
  updateExecution: (
    id: string,
    data: {
      execution_completed_at: string;
      execution_success: boolean;
      execution_error?: string;
      commit_sha?: string;
      files_changed?: string[];
      lines_added?: number;
      lines_removed?: number;
    }
  ): DbDirectionOutcome | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE direction_outcomes
      SET execution_completed_at = ?,
          execution_success = ?,
          execution_error = ?,
          commit_sha = ?,
          files_changed = ?,
          lines_added = ?,
          lines_removed = ?,
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      data.execution_completed_at,
      data.execution_success ? 1 : 0,
      data.execution_error || null,
      data.commit_sha || null,
      data.files_changed ? JSON.stringify(data.files_changed) : null,
      data.lines_added ?? null,
      data.lines_removed ?? null,
      now,
      id
    );

    return selectOne<DbDirectionOutcome>(
      db,
      'SELECT * FROM direction_outcomes WHERE id = ?',
      id
    );
  },

  /**
   * Mark outcome as reverted
   */
  markReverted: (
    id: string,
    revertCommitSha?: string
  ): DbDirectionOutcome | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE direction_outcomes
      SET was_reverted = 1,
          revert_detected_at = ?,
          revert_commit_sha = ?,
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(now, revertCommitSha || null, now, id);

    return selectOne<DbDirectionOutcome>(
      db,
      'SELECT * FROM direction_outcomes WHERE id = ?',
      id
    );
  },

  /**
   * Update user feedback
   */
  updateFeedback: (
    id: string,
    satisfaction: number,
    feedback?: string
  ): DbDirectionOutcome | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE direction_outcomes
      SET user_satisfaction = ?,
          user_feedback = ?,
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(satisfaction, feedback || null, now, id);

    return selectOne<DbDirectionOutcome>(
      db,
      'SELECT * FROM direction_outcomes WHERE id = ?',
      id
    );
  },

  /**
   * Get outcome statistics for a project
   */
  getStats: (projectId: string, days?: number): {
    total: number;
    successful: number;
    failed: number;
    reverted: number;
    pending: number;
    avgSatisfaction: number | null;
  } => {
    const db = getDatabase();
    let query = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN execution_success = 1 THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN execution_success = 0 THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN was_reverted = 1 THEN 1 ELSE 0 END) as reverted,
        SUM(CASE WHEN execution_success IS NULL THEN 1 ELSE 0 END) as pending,
        AVG(user_satisfaction) as avg_satisfaction
      FROM direction_outcomes
      WHERE project_id = ?
    `;
    const params: unknown[] = [projectId];

    if (days) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      query += ' AND created_at >= ?';
      params.push(since);
    }

    const result = selectOne<{
      total: number;
      successful: number;
      failed: number;
      reverted: number;
      pending: number;
      avg_satisfaction: number | null;
    }>(db, query, ...params);

    return {
      total: result?.total ?? 0,
      successful: result?.successful ?? 0,
      failed: result?.failed ?? 0,
      reverted: result?.reverted ?? 0,
      pending: result?.pending ?? 0,
      avgSatisfaction: result?.avg_satisfaction ?? null,
    };
  },

  /**
   * Delete outcome by ID
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM direction_outcomes WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete outcomes by project
   */
  deleteByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM direction_outcomes WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },
};
