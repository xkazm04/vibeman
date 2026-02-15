/**
 * Goal Lifecycle Engine
 *
 * Autonomous engine that infers goal progress from code changes,
 * auto-transitions goal status, and manages sub-goal decomposition.
 *
 * Signal sources:
 * - Implementation logs (context-matched)
 * - Requirement completions
 * - Git commits (context-matched)
 * - Scan completions
 * - Idea implementations
 */

import { goalDb, implementationLogDb, getDatabase } from '@/app/db';
import { goalSignalRepository, goalSubGoalRepository } from '@/app/db/repositories/goal-lifecycle.repository';
import type { DbGoal, GoalSignalType } from '@/app/db/models/types';
import { logger } from '@/lib/logger';

// Progress weights by signal type
const SIGNAL_WEIGHTS: Record<GoalSignalType, number> = {
  implementation_log: 15,
  requirement_completed: 20,
  git_commit: 5,
  scan_completed: 8,
  idea_implemented: 12,
  context_updated: 3,
  manual_update: 0, // manual updates carry explicit progress_delta
};

export interface LifecycleSignalInput {
  projectId: string;
  signalType: GoalSignalType;
  contextId?: string;
  sourceId?: string;
  sourceTitle?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface GoalLifecycleStatus {
  goal: DbGoal;
  signals: Awaited<ReturnType<typeof goalSignalRepository.getByGoal>>;
  subGoals: Awaited<ReturnType<typeof goalSubGoalRepository.getByParent>>;
  subGoalStats: ReturnType<typeof goalSubGoalRepository.getStats>;
  inferredProgress: number;
  signalCounts: Record<string, number>;
  shouldAutoComplete: boolean;
  lastActivity: string | null;
}

/**
 * Process a lifecycle signal - match it to relevant goals and update progress
 */
export function processSignal(input: LifecycleSignalInput): {
  matchedGoals: string[];
  transitions: Array<{ goalId: string; from: string; to: string }>;
} {
  const result = {
    matchedGoals: [] as string[],
    transitions: [] as Array<{ goalId: string; from: string; to: string }>,
  };

  try {
    // Find goals that match this signal
    const matchingGoals = findMatchingGoals(input);

    for (const goal of matchingGoals) {
      // Calculate progress delta based on signal type
      const progressDelta = calculateProgressDelta(goal, input);

      // Record the signal
      goalSignalRepository.create({
        goal_id: goal.id,
        project_id: input.projectId,
        signal_type: input.signalType,
        source_id: input.sourceId,
        source_title: input.sourceTitle,
        description: input.description,
        progress_delta: progressDelta,
        metadata: input.metadata,
      });

      result.matchedGoals.push(goal.id);

      // Compute new inferred progress
      const newProgress = computeInferredProgress(goal.id);

      // Apply status transitions
      const transition = applyStatusTransition(goal, newProgress);
      if (transition) {
        result.transitions.push(transition);
      }
    }
  } catch (error) {
    logger.error('[GoalLifecycle] Error processing signal:', { error, input });
  }

  return result;
}

/**
 * Find goals that match a signal based on context linkage
 */
function findMatchingGoals(input: LifecycleSignalInput): DbGoal[] {
  const allGoals = goalDb.getGoalsByProject(input.projectId);

  // Only match active goals (open or in_progress)
  const activeGoals = allGoals.filter(
    g => g.status === 'open' || g.status === 'in_progress'
  );

  if (!input.contextId) {
    // For signals without context, match all active goals (with lower confidence)
    return activeGoals;
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
 * Calculate progress delta for a signal
 */
function calculateProgressDelta(goal: DbGoal, input: LifecycleSignalInput): number {
  const baseWeight = SIGNAL_WEIGHTS[input.signalType];

  // If the signal is context-matched, give full weight
  const contextMultiplier = (goal.context_id && goal.context_id === input.contextId) ? 1.0 : 0.3;

  return Math.round(baseWeight * contextMultiplier);
}

/**
 * Compute total inferred progress for a goal based on all its signals
 */
function computeInferredProgress(goalId: string): number {
  const signals = goalSignalRepository.getByGoal(goalId);

  if (signals.length === 0) return 0;

  // Sum all progress deltas
  const totalDelta = signals.reduce((sum, s) => sum + (s.progress_delta || 0), 0);

  // Also factor in sub-goal completion
  const subStats = goalSubGoalRepository.getStats(goalId);
  const subGoalProgress = subStats.total > 0
    ? Math.round((subStats.done / subStats.total) * 100)
    : 0;

  // Blend signal-based and sub-goal-based progress
  // Cap at 95% - auto-completion needs explicit threshold
  let progress: number;
  if (subStats.total > 0) {
    // If sub-goals exist, weight them heavily (60% sub-goals, 40% signals)
    progress = Math.round(subGoalProgress * 0.6 + Math.min(totalDelta, 100) * 0.4);
  } else {
    // No sub-goals: use signal-based progress entirely
    progress = Math.min(totalDelta, 100);
  }

  progress = Math.min(progress, 95);

  // Update goal's inferred_progress
  goalDb.updateGoalProgress(goalId, progress);

  return progress;
}

/**
 * Apply automatic status transitions based on inferred progress
 */
function applyStatusTransition(
  goal: DbGoal,
  newProgress: number
): { goalId: string; from: string; to: string } | null {
  const currentStatus = goal.status;
  let newStatus: typeof goal.status | null = null;
  const now = new Date().toISOString();

  // Auto-start: open → in_progress when first meaningful signal arrives
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

/**
 * Get full lifecycle status for a goal
 */
export function getGoalLifecycleStatus(goalId: string): GoalLifecycleStatus | null {
  const goal = goalDb.getGoalById(goalId);
  if (!goal) return null;

  const signals = goalSignalRepository.getByGoal(goalId, 50);
  const subGoals = goalSubGoalRepository.getByParent(goalId);
  const subGoalStats = goalSubGoalRepository.getStats(goalId);
  const signalCounts = goalSignalRepository.getSignalCounts(goalId);
  const inferredProgress = goal.inferred_progress || 0;

  const shouldAutoComplete = goal.lifecycle_status === 'auto_completed'
    || (inferredProgress >= 90 && (subGoalStats.total === 0 || subGoalStats.done === subGoalStats.total));

  return {
    goal,
    signals,
    subGoals,
    subGoalStats,
    inferredProgress,
    signalCounts,
    shouldAutoComplete,
    lastActivity: goal.last_signal_at || null,
  };
}

/**
 * Get lifecycle summary for all goals in a project
 */
export function getProjectLifecycleSummary(projectId: string): Array<{
  goalId: string;
  title: string;
  status: string;
  lifecycleStatus: string;
  inferredProgress: number;
  signalCount: number;
  subGoalCount: number;
  subGoalsDone: number;
  shouldAutoComplete: boolean;
  lastSignalAt: string | null;
}> {
  const goals = goalDb.getGoalsByProject(projectId);

  return goals.map(goal => {
    const subStats = goalSubGoalRepository.getStats(goal.id);
    const inferredProgress = goal.inferred_progress || 0;
    const signalCount = goal.signal_count || 0;

    return {
      goalId: goal.id,
      title: goal.title,
      status: goal.status,
      lifecycleStatus: goal.lifecycle_status || 'manual',
      inferredProgress,
      signalCount,
      subGoalCount: subStats.total,
      subGoalsDone: subStats.done,
      shouldAutoComplete: goal.lifecycle_status === 'auto_completed'
        || (inferredProgress >= 90 && (subStats.total === 0 || subStats.done === subStats.total)),
      lastSignalAt: goal.last_signal_at || null,
    };
  });
}

/**
 * Manually confirm auto-completion of a goal
 */
export function confirmGoalCompletion(goalId: string): DbGoal | null {
  const now = new Date().toISOString();

  goalSignalRepository.create({
    goal_id: goalId,
    project_id: goalDb.getGoalById(goalId)?.project_id || '',
    signal_type: 'manual_update',
    description: 'Goal manually confirmed as complete',
    progress_delta: 100,
  });

  return goalDb.updateGoal(goalId, { status: 'done' });
}

/**
 * Dismiss auto-completion suggestion (keep goal in_progress)
 */
export function dismissAutoCompletion(goalId: string): void {
  const db = getDatabase();
  db.prepare(`
    UPDATE goals SET lifecycle_status = 'auto_tracking', auto_completed_at = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).run(goalId);
}

/**
 * Scan a project for unlinked signals and catch up progress
 * Called periodically or when lifecycle engine is first enabled
 */
export function catchUpGoalProgress(projectId: string): {
  goalsUpdated: number;
  signalsCreated: number;
} {
  let goalsUpdated = 0;
  let signalsCreated = 0;

  try {
    const goals = goalDb.getGoalsByProject(projectId);
    const activeGoals = goals.filter(g => g.status === 'open' || g.status === 'in_progress');

    for (const goal of activeGoals) {
      if (!goal.context_id) continue;

      // Check for implementation logs in this context that aren't signaled yet
      const contextLogs = implementationLogDb.getLogsByContext(goal.context_id);
      const existingSignals = goalSignalRepository.getByGoal(goal.id);
      const existingSourceIds = new Set(existingSignals.map(s => s.source_id).filter(Boolean));

      for (const log of contextLogs) {
        if (existingSourceIds.has(log.id)) continue;

        goalSignalRepository.create({
          goal_id: goal.id,
          project_id: projectId,
          signal_type: 'implementation_log',
          source_id: log.id,
          source_title: log.title,
          description: `Catch-up: ${log.title}`,
          progress_delta: SIGNAL_WEIGHTS.implementation_log,
        });
        signalsCreated++;
      }

      if (signalsCreated > 0) {
        computeInferredProgress(goal.id);
        goalsUpdated++;
      }
    }
  } catch (error) {
    logger.error('[GoalLifecycle] Error catching up progress:', { error, projectId });
  }

  return { goalsUpdated, signalsCreated };
}
