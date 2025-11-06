import { getDatabase } from '../connection';
import { DbGoal } from '../models/types';
import { buildUpdateQuery, getCurrentTimestamp, selectOne } from './repository.utils';

/**
 * Goal Repository
 * Handles all database operations for goals
 */
export const goalRepository = {
  /**
   * Get all goals for a project
   */
  getGoalsByProject: (projectId: string): DbGoal[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM goals
      WHERE project_id = ?
      ORDER BY order_index ASC
    `);
    return stmt.all(projectId) as DbGoal[];
  },

  /**
   * Get a single goal by ID
   */
  getGoalById: (goalId: string): DbGoal | null => {
    const db = getDatabase();
    return selectOne<DbGoal>(db, 'SELECT * FROM goals WHERE id = ?', goalId);
  },

  /**
   * Create a new goal
   */
  createGoal: (goal: {
    id: string;
    project_id: string;
    context_id?: string;
    title: string;
    description?: string;
    status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
    order_index: number;
  }): DbGoal => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO goals (id, project_id, context_id, order_index, title, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      goal.id,
      goal.project_id,
      goal.context_id || null,
      goal.order_index,
      goal.title,
      goal.description || null,
      goal.status,
      now,
      now
    );

    return selectOne<DbGoal>(db, 'SELECT * FROM goals WHERE id = ?', goal.id)!;
  },

  /**
   * Update a goal
   */
  updateGoal: (id: string, updates: {
    title?: string;
    description?: string;
    status?: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
    order_index?: number;
    context_id?: string | null;
  }): DbGoal | null => {
    const db = getDatabase();
    const { fields, values } = buildUpdateQuery(updates);

    if (fields.length === 0) {
      return selectOne<DbGoal>(db, 'SELECT * FROM goals WHERE id = ?', id);
    }

    const now = getCurrentTimestamp();
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE goals
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return selectOne<DbGoal>(db, 'SELECT * FROM goals WHERE id = ?', id);
  },

  /**
   * Delete a goal
   */
  deleteGoal: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM goals WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get the maximum order index for a project
   */
  getMaxOrderIndex: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT MAX(order_index) as max_order
      FROM goals
      WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { max_order: number | null };
    return result.max_order || 0;
  }
};
