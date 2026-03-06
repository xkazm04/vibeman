import { getDatabase } from '../connection';
import { DbGoal } from '../models/types';
import { getCurrentTimestamp, selectOne } from './repository.utils';
import { createGenericRepository } from './generic.repository';

const base = createGenericRepository<DbGoal>({
  tableName: 'goals',
  defaultOrder: 'order_index ASC',
});

/**
 * Goal Repository
 * Handles all database operations for goals
 */
export const goalRepository = {
  /**
   * Get all goals for a project
   */
  getGoalsByProject: (projectId: string): DbGoal[] => base.getByProject(projectId),

  /**
   * Get a single goal by ID
   */
  getGoalById: (goalId: string): DbGoal | null => base.getById(goalId),

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

    return base.getById(goal.id)!;
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
  }): DbGoal | null => base.update(id, updates as Record<string, unknown>),

  /**
   * Delete a goal
   */
  deleteGoal: (id: string): boolean => base.deleteById(id),

  /**
   * Get in-progress goals that match a specific context_id
   */
  getActiveGoalsByContextId: (contextId: string): DbGoal[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM goals
      WHERE context_id = ? AND status IN ('open', 'in_progress')
      ORDER BY order_index ASC
    `);
    return stmt.all(contextId) as DbGoal[];
  },

  /**
   * Update goal progress metadata
   */
  updateGoalProgress: (goalId: string, progress: number): DbGoal | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      UPDATE goals
      SET progress = ?, updated_at = ?
      WHERE id = ?
    `);
    const result = stmt.run(progress, now, goalId);
    if (result.changes === 0) return null;
    return selectOne<DbGoal>(db, 'SELECT * FROM goals WHERE id = ?', goalId);
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
