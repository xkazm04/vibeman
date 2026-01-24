/**
 * Goal Hub Repository
 * Database extensions for goal operations
 */

import { getDatabase } from '../connection';
import { getCurrentTimestamp } from './repository.utils';

// ============================================================================
// GOAL EXTENSIONS
// ============================================================================

export const goalHubExtensions = {
  /**
   * Start working on a goal
   */
  startGoal(goalId: string): void {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      UPDATE goals
      SET status = 'in_progress', started_at = ?, updated_at = ?
      WHERE id = ? AND started_at IS NULL
    `);
    stmt.run(now, now, goalId);
  },

  /**
   * Complete a goal
   */
  completeGoal(goalId: string): void {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      UPDATE goals
      SET status = 'done', completed_at = ?, progress = 100, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, now, goalId);
  },

  /**
   * Set target date for a goal
   */
  setTargetDate(goalId: string, targetDate: Date): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE goals
      SET target_date = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(targetDate.toISOString(), getCurrentTimestamp(), goalId);
  },
};
