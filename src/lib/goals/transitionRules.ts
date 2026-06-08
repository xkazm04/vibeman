/**
 * Transition Rules
 *
 * Status FSM logic for goal lifecycle transitions.
 * Handles auto-start and auto-completion detection.
 */

import { getDatabase } from '@/app/db/connection';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { goalSubGoalRepository } from '@/app/db/repositories/goal-lifecycle.repository';
import type { DbGoal } from '@/app/db/models/types';
import { logger } from '@/lib/logger';

/**
 * Find goals that match a signal based on context linkage
 */
export function findMatchingGoals(input: {
  projectId: string;
  contextId?: string;
  signalType: string;
}): DbGoal[] {
  const allGoals = goalRepository.getGoalsByProject(input.projectId);

  // Only match active goals (open or in_progress)
  const activeGoals = allGoals.filter(
    g => g.status === 'open' || g.status === 'in_progress'
  );

  if (!input.contextId) {
    // Contextless signals should NOT fan out to all goals — that inflates progress.
    // Only match goals that also lack a context (project-level goals),
    // and only for high-signal types that genuinely indicate broad progress.
    if (input.signalType === 'requirement_completed' || input.signalType === 'implementation_log') {
      return activeGoals.filter(g => !g.context_id);
    }
    return [];
  }

  // Prefer goals linked to the same context
  const contextMatched = activeGoals.filter(g => g.context_id === input.contextId);

  if (contextMatched.length > 0) {
    return contextMatched;
  }

  // Fallback: if no context-matched goals, still signal global progress
  // but only for high-signal types
  if (input.signalType === 'requirement_completed' || input.signalType === 'implementation_log') {
    return activeGoals;
  }

  return [];
}

/**
 * Apply automatic status transitions based on inferred progress.
 *
 * Transition rules:
 * - open -> in_progress: when first meaningful signal arrives (progress > 0)
 * - in_progress -> auto_completed (lifecycle_status): when progress >= 90%
 *   AND all sub-goals done (or no sub-goals with 8+ signals)
 */
export function applyStatusTransition(
  goal: DbGoal,
  newProgress: number
): { goalId: string; from: string; to: string } | null {
  const currentStatus = goal.status;
  let newStatus: typeof goal.status | null = null;
  const now = new Date().toISOString();

  // Auto-start: open -> in_progress when first meaningful signal arrives
  if (currentStatus === 'open' && newProgress > 0) {
    newStatus = 'in_progress';

    const db = getDatabase();
    db.prepare(`
      UPDATE goals
      SET status = 'in_progress', lifecycle_status = 'auto_tracking',
          auto_started_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, goal.id);

    logger.info('[GoalLifecycle] Auto-started goal', { goalId: goal.id, title: goal.title });
    return { goalId: goal.id, from: currentStatus, to: 'in_progress' };
  }

  // Auto-complete suggestion: don't actually complete, but mark as ready
  // Progress >= 90 and all sub-goals done (or no sub-goals with 10+ signals)
  if (currentStatus === 'in_progress' && newProgress >= 90) {
    const subStats = goalSubGoalRepository.getStats(goal.id);
    const allSubGoalsDone = subStats.total === 0 || subStats.done === subStats.total;
    const signalCount = goal.signal_count || 0;

    if (allSubGoalsDone && (subStats.total > 0 || signalCount >= 8)) {
      const db = getDatabase();
      db.prepare(`
        UPDATE goals
        SET lifecycle_status = 'auto_completed', auto_completed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(now, now, goal.id);

      logger.info('[GoalLifecycle] Goal ready for auto-completion', {
        goalId: goal.id,
        title: goal.title,
        progress: newProgress,
      });
    }
  }

  return newStatus ? { goalId: goal.id, from: currentStatus, to: newStatus } : null;
}
