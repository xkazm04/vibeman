import { getDatabase } from '../connection';
import { DbGoalCandidate } from '../models/types';

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

    const params: any[] = [projectId];

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
  getCandidateById: (candidateId: string): DbGoalCandidate | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM goal_candidates
      WHERE id = ?
    `);
    const candidate = stmt.get(candidateId) as DbGoalCandidate | undefined;
    return candidate || null;
  },

  /**
   * Create a new goal candidate
   */
  createCandidate: (candidate: {
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
  }): DbGoalCandidate => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO goal_candidates (
        id, project_id, context_id, title, description, reasoning,
        priority_score, source, source_metadata, suggested_status,
        user_action, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

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

    // Return the created candidate
    const selectStmt = db.prepare('SELECT * FROM goal_candidates WHERE id = ?');
    return selectStmt.get(candidate.id) as DbGoalCandidate;
  },

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

    const stmt = db.prepare(`
      INSERT INTO goal_candidates (
        id, project_id, context_id, title, description, reasoning,
        priority_score, source, source_metadata, suggested_status,
        user_action, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Insert all candidates
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
  },

  /**
   * Update a goal candidate
   */
  updateCandidate: (id: string, updates: {
    title?: string;
    description?: string;
    priority_score?: number;
    suggested_status?: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
    user_action?: 'accepted' | 'rejected' | 'tweaked' | 'pending' | null;
    goal_id?: string | null;
    context_id?: string | null;
  }): DbGoalCandidate | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description || null);
    }
    if (updates.priority_score !== undefined) {
      updateFields.push('priority_score = ?');
      values.push(updates.priority_score);
    }
    if (updates.suggested_status !== undefined) {
      updateFields.push('suggested_status = ?');
      values.push(updates.suggested_status);
    }
    if (updates.user_action !== undefined) {
      updateFields.push('user_action = ?');
      values.push(updates.user_action);
    }
    if (updates.goal_id !== undefined) {
      updateFields.push('goal_id = ?');
      values.push(updates.goal_id);
    }
    if (updates.context_id !== undefined) {
      updateFields.push('context_id = ?');
      values.push(updates.context_id);
    }

    if (updateFields.length === 0) {
      // No updates to make
      const selectStmt = db.prepare('SELECT * FROM goal_candidates WHERE id = ?');
      return selectStmt.get(id) as DbGoalCandidate | null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE goal_candidates
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null; // Candidate not found
    }

    // Return the updated candidate
    const selectStmt = db.prepare('SELECT * FROM goal_candidates WHERE id = ?');
    return selectStmt.get(id) as DbGoalCandidate;
  },

  /**
   * Delete a goal candidate
   */
  deleteCandidate: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM goal_candidates WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all candidates for a project (with optional filter)
   */
  deleteCandidatesByProject: (projectId: string, userAction?: 'pending' | 'accepted' | 'rejected' | 'tweaked'): number => {
    const db = getDatabase();

    let query = 'DELETE FROM goal_candidates WHERE project_id = ?';
    const params: any[] = [projectId];

    if (userAction) {
      query += ' AND user_action = ?';
      params.push(userAction);
    }

    const stmt = db.prepare(query);
    const result = stmt.run(...params);
    return result.changes;
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
