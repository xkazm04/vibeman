import { getDatabase } from '../connection';
import type { DbGoalSignal, DbGoalSubGoal, DbGoal } from '../models/types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Goal Signal Repository
 * Tracks evidence of goal progress (implementation logs, commits, scans, etc.)
 */
export const goalSignalRepository = {
  create: (signal: {
    goal_id: string;
    project_id: string;
    signal_type: DbGoalSignal['signal_type'];
    source_id?: string;
    source_title?: string;
    description?: string;
    progress_delta?: number;
    metadata?: Record<string, unknown>;
  }): DbGoalSignal => {
    const db = getDatabase();
    const id = generateId('gsig');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO goal_signals (id, goal_id, project_id, signal_type, source_id, source_title, description, progress_delta, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      signal.goal_id,
      signal.project_id,
      signal.signal_type,
      signal.source_id || null,
      signal.source_title || null,
      signal.description || null,
      signal.progress_delta || 0,
      signal.metadata ? JSON.stringify(signal.metadata) : null,
      now
    );

    // Update goal's signal tracking
    db.prepare(`
      UPDATE goals SET signal_count = COALESCE(signal_count, 0) + 1, last_signal_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, signal.goal_id);

    return db.prepare('SELECT * FROM goal_signals WHERE id = ?').get(id) as DbGoalSignal;
  },

  getByGoal: (goalId: string, limit: number = 50): DbGoalSignal[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM goal_signals WHERE goal_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(goalId, limit) as DbGoalSignal[];
  },

  getSignalCounts: (goalId: string): Record<string, number> => {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT signal_type, COUNT(*) as count
      FROM goal_signals WHERE goal_id = ?
      GROUP BY signal_type
    `).all(goalId) as Array<{ signal_type: string; count: number }>;

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.signal_type] = row.count;
    }
    return counts;
  },
};

/**
 * Goal Sub-Goal Repository
 * Manages AI-decomposed sub-objectives within a parent goal
 */
export const goalSubGoalRepository = {
  createBatch: (subGoals: Array<{
    parent_goal_id: string;
    project_id: string;
    title: string;
    description?: string;
    order_index: number;
  }>): DbGoalSubGoal[] => {
    const db = getDatabase();
    const now = new Date().toISOString();
    const ids: string[] = [];

    const stmt = db.prepare(`
      INSERT INTO goal_sub_goals (id, parent_goal_id, project_id, title, description, order_index, status, progress, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'open', 0, ?, ?)
    `);

    for (const sg of subGoals) {
      const id = generateId('gsg');
      ids.push(id);
      stmt.run(id, sg.parent_goal_id, sg.project_id, sg.title, sg.description || null, sg.order_index, now, now);
    }

    const placeholders = ids.map(() => '?').join(',');
    return db.prepare(`SELECT * FROM goal_sub_goals WHERE id IN (${placeholders}) ORDER BY order_index`).all(...ids) as DbGoalSubGoal[];
  },

  getByParent: (parentGoalId: string): DbGoalSubGoal[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM goal_sub_goals WHERE parent_goal_id = ? ORDER BY order_index ASC
    `).all(parentGoalId) as DbGoalSubGoal[];
  },

  update: (id: string, updates: {
    title?: string;
    description?: string;
    status?: 'open' | 'in_progress' | 'done' | 'skipped';
    progress?: number;
  }): DbGoalSubGoal | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
      if (updates.status === 'done') {
        fields.push('completed_at = ?');
        values.push(now);
      }
    }
    if (updates.progress !== undefined) { fields.push('progress = ?'); values.push(updates.progress); }

    if (fields.length === 0) return null;

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE goal_sub_goals SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM goal_sub_goals WHERE id = ?').get(id) as DbGoalSubGoal | null;
  },

  deleteByParent: (parentGoalId: string): number => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM goal_sub_goals WHERE parent_goal_id = ?').run(parentGoalId);
    return (result as any).changes;
  },

  getStats: (parentGoalId: string): { total: number; done: number; inProgress: number; open: number } => {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count
      FROM goal_sub_goals WHERE parent_goal_id = ?
    `).get(parentGoalId) as any;

    return {
      total: row.total || 0,
      done: row.done || 0,
      inProgress: row.in_progress || 0,
      open: row.open_count || 0,
    };
  },
};
