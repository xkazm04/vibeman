import { getDatabase } from '../connection';
import { DbGoalCandidate } from '../models/types';
import { createGenericRepository } from './generic.repository';

const base = createGenericRepository<DbGoalCandidate>({
  tableName: 'goal_candidates',
  defaultOrder: 'priority_score DESC, created_at DESC',
});

/**
 * Goal Candidate Repository
 * Handles all database operations for AI-generated goal suggestions
 */
export const goalCandidateRepository = {
  /**
   * Get all goal candidates for a project
   */
  getCandidatesByProject: (projectId: string, userAction?: 'pending' | 'accepted' | 'rejected' | 'tweaked'): DbGoalCandidate[] => {
    const db = getDatabase();

    let query = `
      SELECT * FROM goal_candidates
      WHERE project_id = ?
    `;

    const params: (string | number)[] = [projectId];

    if (userAction) {
      query += ` AND user_action = ?`;
      params.push(userAction);
    } else {
      // By default, only show pending candidates
      query += ` AND (user_action IS NULL OR user_action = 'pending')`;
    }

    query += ` ORDER BY priority_score DESC, created_at DESC`;

    const stmt = db.prepare(query);
    return stmt.all(...params) as DbGoalCandidate[];
  },

  /**
   * Get a single goal candidate by ID
   */
  getCandidateById: (candidateId: string): DbGoalCandidate | null => base.getById(candidateId),

  /**
   * Create multiple goal candidates in a batch
   */
  createCandidatesBatch: (candidates: Array<{
    id: string;
    project_id: string;
    context_id?: string;
    title: string;
    description?: string;
    reasoning?: string;
    priority_score: number;
    source: string;
    source_metadata?: string;
    suggested_status?: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  }>): DbGoalCandidate[] => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const insertAll = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO goal_candidates (
          id, project_id, context_id, title, description, reasoning,
          priority_score, source, source_metadata, suggested_status,
          user_action, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const candidate of candidates) {
        stmt.run(
          candidate.id,
          candidate.project_id,
          candidate.context_id || null,
          candidate.title,
          candidate.description || null,
          candidate.reasoning || null,
          candidate.priority_score,
          candidate.source,
          candidate.source_metadata || null,
          candidate.suggested_status || 'open',
          'pending',
          now,
          now
        );
      }

      // Return all created candidates
      const ids = candidates.map(c => c.id);
      const placeholders = ids.map(() => '?').join(',');
      const selectStmt = db.prepare(`
        SELECT * FROM goal_candidates WHERE id IN (${placeholders})
      `);
      return selectStmt.all(...ids) as DbGoalCandidate[];
    });

    return insertAll();
  },

  /**
   * Update a goal candidate
   */
  updateCandidate: (id: string, updates: Partial<Pick<DbGoalCandidate,
    'title' | 'description' | 'priority_score' | 'suggested_status' |
    'user_action' | 'rejection_reason' | 'goal_id' | 'context_id'
  >>): DbGoalCandidate | null => {
    const serialized: Record<string, unknown> = { ...updates };
    return base.update(id, serialized);
  },

  /**
   * Delete a goal candidate
   */
  deleteCandidate: (id: string): boolean => base.deleteById(id),

  /**
   * Delete all candidates for a project (with optional filter)
   */
  deleteCandidatesByProject: (projectId: string, userAction?: 'pending' | 'accepted' | 'rejected' | 'tweaked'): number => {
    const db = getDatabase();

    let query = 'DELETE FROM goal_candidates WHERE project_id = ?';
    const params: (string | number)[] = [projectId];

    if (userAction) {
      query += ' AND user_action = ?';
      params.push(userAction);
    }

    const stmt = db.prepare(query);
    const result = stmt.run(...params);
    return result.changes;
  },

  /**
   * Get rejected candidates that have a rejection_reason (for feedback loop)
   */
  getRejectedCandidatesWithReasons: (projectId: string, limit = 20): Array<{ title: string; rejection_reason: string }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT title, rejection_reason
      FROM goal_candidates
      WHERE project_id = ? AND user_action = 'rejected' AND rejection_reason IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT ?
    `);
    return stmt.all(projectId, limit) as Array<{ title: string; rejection_reason: string }>;
  },

  /**
   * Get statistics about goal candidates
   */
  getCandidateStats: (projectId: string): {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    tweaked: number;
    avgPriorityScore: number;
  } => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN user_action = 'pending' OR user_action IS NULL THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN user_action = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN user_action = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN user_action = 'tweaked' THEN 1 ELSE 0 END) as tweaked,
        AVG(priority_score) as avgPriorityScore
      FROM goal_candidates
      WHERE project_id = ?
    `);

    const result = stmt.get(projectId) as any;

    return {
      total: result.total || 0,
      pending: result.pending || 0,
      accepted: result.accepted || 0,
      rejected: result.rejected || 0,
      tweaked: result.tweaked || 0,
      avgPriorityScore: result.avgPriorityScore || 0
    };
  }
};
