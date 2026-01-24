import { getDatabase } from '../connection';
import { DbDirection } from '../models/types';
import { buildUpdateQuery, getCurrentTimestamp, selectOne } from './repository.utils';

/**
 * Direction Repository
 * Handles all database operations for directions (actionable development guidance)
 * Directions are generated per context_map entry and when accepted, create Claude Code requirements
 */
export const directionRepository = {
  /**
   * Get all directions for a project
   */
  getDirectionsByProject: (projectId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbDirection[];
  },

  /**
   * Get directions by context_map_id
   */
  getDirectionsByContextMapId: (projectId: string, contextMapId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ? AND context_map_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, contextMapId) as DbDirection[];
  },

  /**
   * Get pending directions for a project
   */
  getPendingDirections: (projectId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbDirection[];
  },

  /**
   * Get accepted directions for a project
   */
  getAcceptedDirections: (projectId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ? AND status = 'accepted'
      ORDER BY updated_at DESC
    `);
    return stmt.all(projectId) as DbDirection[];
  },

  /**
   * Get rejected directions for a project
   */
  getRejectedDirections: (projectId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ? AND status = 'rejected'
      ORDER BY updated_at DESC
    `);
    return stmt.all(projectId) as DbDirection[];
  },

  /**
   * Get all pending directions across all projects (for Tinder "all projects" mode)
   */
  getAllPendingDirections: (): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `);
    return stmt.all() as DbDirection[];
  },

  /**
   * Delete all pending directions for a project (for Tinder flush)
   */
  deletePendingDirectionsByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM directions WHERE project_id = ? AND status = ?');
    const result = stmt.run(projectId, 'pending');
    return result.changes;
  },

  /**
   * Delete all pending directions across all projects (for Tinder flush all)
   */
  deleteAllPendingDirections: (): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM directions WHERE status = ?');
    const result = stmt.run('pending');
    return result.changes;
  },

  /**
   * Get a single direction by ID
   */
  getDirectionById: (directionId: string): DbDirection | null => {
    const db = getDatabase();
    return selectOne<DbDirection>(db, 'SELECT * FROM directions WHERE id = ?', directionId);
  },

  /**
   * Get directions by SQLite context_id
   */
  getDirectionsByContextId: (projectId: string, contextId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ? AND context_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, contextId) as DbDirection[];
  },

  /**
   * Get directions by SQLite context_group_id
   */
  getDirectionsByContextGroupId: (projectId: string, contextGroupId: string): DbDirection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM directions
      WHERE project_id = ? AND context_group_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, contextGroupId) as DbDirection[];
  },

  /**
   * Create a new direction
   */
  createDirection: (direction: {
    id: string;
    project_id: string;
    context_map_id: string;
    context_map_title: string;
    direction: string;
    summary: string;
    status?: 'pending' | 'accepted' | 'rejected';
    requirement_id?: string | null;
    requirement_path?: string | null;
    // NEW: SQLite context fields
    context_id?: string | null;
    context_name?: string | null;
    context_group_id?: string | null;
  }): DbDirection => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO directions (
        id, project_id, context_map_id, context_map_title, direction, summary, status,
        requirement_id, requirement_path, context_id, context_name, context_group_id,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      direction.id,
      direction.project_id,
      direction.context_map_id,
      direction.context_map_title,
      direction.direction,
      direction.summary,
      direction.status || 'pending',
      direction.requirement_id || null,
      direction.requirement_path || null,
      direction.context_id || null,
      direction.context_name || null,
      direction.context_group_id || null,
      now,
      now
    );

    return selectOne<DbDirection>(db, 'SELECT * FROM directions WHERE id = ?', direction.id)!;
  },

  /**
   * Update a direction
   */
  updateDirection: (id: string, updates: {
    direction?: string;
    summary?: string;
    status?: 'pending' | 'accepted' | 'rejected';
    requirement_id?: string | null;
    requirement_path?: string | null;
    context_map_title?: string;
    // NEW: SQLite context fields
    context_id?: string | null;
    context_name?: string | null;
    context_group_id?: string | null;
  }): DbDirection | null => {
    const db = getDatabase();
    const { fields, values } = buildUpdateQuery(updates);

    if (fields.length === 0) {
      return selectOne<DbDirection>(db, 'SELECT * FROM directions WHERE id = ?', id);
    }

    const now = getCurrentTimestamp();
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE directions
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return selectOne<DbDirection>(db, 'SELECT * FROM directions WHERE id = ?', id);
  },

  /**
   * Accept a direction (creates requirement and updates status)
   */
  acceptDirection: (id: string, requirementId: string, requirementPath: string): DbDirection | null => {
    return directionRepository.updateDirection(id, {
      status: 'accepted',
      requirement_id: requirementId,
      requirement_path: requirementPath
    });
  },

  /**
   * Reject a direction
   */
  rejectDirection: (id: string): DbDirection | null => {
    return directionRepository.updateDirection(id, {
      status: 'rejected'
    });
  },

  /**
   * Delete a direction
   */
  deleteDirection: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM directions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all directions for a project
   */
  deleteDirectionsByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM directions WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Delete directions by context_map_id
   */
  deleteDirectionsByContextMapId: (projectId: string, contextMapId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM directions WHERE project_id = ? AND context_map_id = ?');
    const result = stmt.run(projectId, contextMapId);
    return result.changes;
  },

  /**
   * Get direction count by status for a project
   */
  getDirectionCounts: (projectId: string): { pending: number; accepted: number; rejected: number; total: number } => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM directions
      WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { total: number; pending: number; accepted: number; rejected: number };
    return {
      total: result.total || 0,
      pending: result.pending || 0,
      accepted: result.accepted || 0,
      rejected: result.rejected || 0
    };
  }
};
