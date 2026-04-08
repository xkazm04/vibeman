/**
 * Goal Dependency Repository
 * CRUD operations for goal dependency/blocking relationships
 */

import { getDatabase } from '../connection';
import { generateId, getCurrentTimestamp } from './repository.utils';
import type { DbGoalDependency, GoalDependencyType } from '../models/types';

export interface GoalDependencyWithDetails extends DbGoalDependency {
  parent_title: string;
  parent_status: string;
  child_title: string;
  child_status: string;
}

export const goalDependencyRepository = {
  /**
   * Create a dependency between two goals.
   * parent_goal_id "blocks" child_goal_id (child depends on parent).
   */
  create(parentGoalId: string, childGoalId: string, relationshipType: GoalDependencyType = 'blocks'): DbGoalDependency {
    const db = getDatabase();
    const id = generateId('gdep');
    const now = getCurrentTimestamp();

    db.prepare(`
      INSERT OR IGNORE INTO goal_dependencies (id, parent_goal_id, child_goal_id, relationship_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, parentGoalId, childGoalId, relationshipType, now);

    return db.prepare('SELECT * FROM goal_dependencies WHERE id = ?').get(id) as DbGoalDependency;
  },

  /**
   * Get goals that this goal blocks (outgoing edges — this goal is the parent/blocker)
   */
  getBlockedBy(goalId: string): GoalDependencyWithDetails[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        d.*,
        p.title as parent_title,
        p.status as parent_status,
        c.title as child_title,
        c.status as child_status
      FROM goal_dependencies d
      JOIN goals p ON d.parent_goal_id = p.id
      JOIN goals c ON d.child_goal_id = c.id
      WHERE d.parent_goal_id = ?
    `).all(goalId) as GoalDependencyWithDetails[];
  },

  /**
   * Get goals that block this goal (incoming edges — this goal is the child/blocked)
   */
  getBlockers(goalId: string): GoalDependencyWithDetails[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        d.*,
        p.title as parent_title,
        p.status as parent_status,
        c.title as child_title,
        c.status as child_status
      FROM goal_dependencies d
      JOIN goals p ON d.parent_goal_id = p.id
      JOIN goals c ON d.child_goal_id = c.id
      WHERE d.child_goal_id = ?
    `).all(goalId) as GoalDependencyWithDetails[];
  },

  /**
   * Get all dependencies for a project (for DAG rendering)
   */
  getByProject(projectId: string): GoalDependencyWithDetails[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        d.*,
        p.title as parent_title,
        p.status as parent_status,
        c.title as child_title,
        c.status as child_status
      FROM goal_dependencies d
      JOIN goals p ON d.parent_goal_id = p.id
      JOIN goals c ON d.child_goal_id = c.id
      WHERE p.project_id = ?
    `).all(projectId) as GoalDependencyWithDetails[];
  },

  /**
   * Get all dependencies for a specific goal (both directions)
   */
  getAllForGoal(goalId: string): GoalDependencyWithDetails[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        d.*,
        p.title as parent_title,
        p.status as parent_status,
        c.title as child_title,
        c.status as child_status
      FROM goal_dependencies d
      JOIN goals p ON d.parent_goal_id = p.id
      JOIN goals c ON d.child_goal_id = c.id
      WHERE d.parent_goal_id = ? OR d.child_goal_id = ?
    `).all(goalId, goalId) as GoalDependencyWithDetails[];
  },

  /**
   * Detect blocking status: find active goals blocked by stalled/non-done parents.
   * Returns child goals that have at least one non-done blocking parent.
   */
  getBlockedGoals(projectId: string): Array<{
    blocked_goal_id: string;
    blocked_goal_title: string;
    blocked_goal_status: string;
    blocker_goal_id: string;
    blocker_goal_title: string;
    blocker_goal_status: string;
  }> {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        c.id as blocked_goal_id,
        c.title as blocked_goal_title,
        c.status as blocked_goal_status,
        p.id as blocker_goal_id,
        p.title as blocker_goal_title,
        p.status as blocker_goal_status
      FROM goal_dependencies d
      JOIN goals p ON d.parent_goal_id = p.id
      JOIN goals c ON d.child_goal_id = c.id
      WHERE p.project_id = ?
        AND d.relationship_type = 'blocks'
        AND p.status NOT IN ('done')
        AND c.status IN ('open', 'in_progress')
      ORDER BY c.title
    `).all(projectId) as Array<{
      blocked_goal_id: string;
      blocked_goal_title: string;
      blocked_goal_status: string;
      blocker_goal_id: string;
      blocker_goal_title: string;
      blocker_goal_status: string;
    }>;
  },

  /**
   * Delete a specific dependency
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM goal_dependencies WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * Delete all dependencies for a goal (both directions)
   */
  deleteAllForGoal(goalId: string): number {
    const db = getDatabase();
    const result = db.prepare(
      'DELETE FROM goal_dependencies WHERE parent_goal_id = ? OR child_goal_id = ?'
    ).run(goalId, goalId);
    return result.changes;
  },

  /**
   * Check if adding a dependency would create a cycle.
   * Uses iterative BFS from child → ancestors to detect if parent is reachable.
   */
  wouldCreateCycle(parentGoalId: string, childGoalId: string): boolean {
    if (parentGoalId === childGoalId) return true;

    const db = getDatabase();
    const visited = new Set<string>();
    const queue = [parentGoalId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      // Get all goals that block `current` (current is a child)
      const parents = db.prepare(
        `SELECT parent_goal_id FROM goal_dependencies WHERE child_goal_id = ? AND relationship_type = 'blocks'`
      ).all(current) as Array<{ parent_goal_id: string }>;

      for (const p of parents) {
        if (p.parent_goal_id === childGoalId) return true;
        queue.push(p.parent_goal_id);
      }
    }

    return false;
  },
};
