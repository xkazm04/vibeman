import { getDatabase } from '../connection';
import { DbGoal } from '../models/types';
import { getCurrentTimestamp, selectOne } from './repository.utils';
import { createGenericRepository } from './generic.repository';
import { goalTransition, GoalStatus } from '@/lib/stateMachine';

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
    // Constraint fields (optional — DB has defaults)
    target_paths?: string[] | null;
    excluded_paths?: string[] | null;
    max_sessions?: number;
    priority?: 'low' | 'normal' | 'high';
    checkpoint_config?: Record<string, boolean> | null;
    use_brain?: boolean;
  }): DbGoal => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Build columns/values dynamically so DB defaults apply when fields are omitted
    const columns = ['id', 'project_id', 'context_id', 'order_index', 'title', 'description', 'status', 'created_at', 'updated_at'];
    const values: unknown[] = [
      goal.id, goal.project_id, goal.context_id || null, goal.order_index,
      goal.title, goal.description || null, goal.status, now, now,
    ];

    if (goal.target_paths !== undefined) {
      columns.push('target_paths');
      values.push(goal.target_paths ? JSON.stringify(goal.target_paths) : null);
    }
    if (goal.excluded_paths !== undefined) {
      columns.push('excluded_paths');
      values.push(goal.excluded_paths ? JSON.stringify(goal.excluded_paths) : null);
    }
    if (goal.max_sessions !== undefined) {
      columns.push('max_sessions');
      values.push(goal.max_sessions);
    }
    if (goal.priority !== undefined) {
      columns.push('priority');
      values.push(goal.priority);
    }
    if (goal.checkpoint_config !== undefined) {
      columns.push('checkpoint_config');
      values.push(goal.checkpoint_config ? JSON.stringify(goal.checkpoint_config) : null);
    }
    if (goal.use_brain !== undefined) {
      columns.push('use_brain');
      values.push(goal.use_brain ? 1 : 0);
    }

    const placeholders = columns.map(() => '?').join(', ');
    const stmt = db.prepare(`INSERT INTO goals (${columns.join(', ')}) VALUES (${placeholders})`);
    stmt.run(...values);

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
    target_paths?: string[] | null;
    excluded_paths?: string[] | null;
    max_sessions?: number;
    priority?: 'low' | 'normal' | 'high';
    checkpoint_config?: Record<string, boolean> | null;
    use_brain?: boolean;
  }): DbGoal | null => {
    if (updates.status !== undefined) {
      const current = base.getById(id);
      if (current) {
        goalTransition(current.status as GoalStatus, updates.status);
      }
    }
    // Serialize JSON fields before passing to generic update
    const serialized: Record<string, unknown> = { ...updates };
    if (updates.target_paths !== undefined) {
      serialized.target_paths = updates.target_paths ? JSON.stringify(updates.target_paths) : null;
    }
    if (updates.excluded_paths !== undefined) {
      serialized.excluded_paths = updates.excluded_paths ? JSON.stringify(updates.excluded_paths) : null;
    }
    if (updates.checkpoint_config !== undefined) {
      serialized.checkpoint_config = updates.checkpoint_config ? JSON.stringify(updates.checkpoint_config) : null;
    }
    if (updates.use_brain !== undefined) {
      serialized.use_brain = updates.use_brain ? 1 : 0;
    }
    return base.update(id, serialized);
  },

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
