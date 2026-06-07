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
 *
 * This file orchestrates the lifecycle pipeline and re-exports
 * focused modules for backward compatibility:
 * - signalWeighting.ts  – type-to-weight mapping
 * - progressCalculator.ts – unified progress math
 * - transitionRules.ts  – status FSM logic
 */

import { getDatabase } from '@/app/db/connection';
import { goalDependencyRepository } from '@/app/db/repositories/goal-dependency.repository';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { implementationLogRepository } from '@/app/db/repositories/implementation-log.repository';
import { goalSignalRepository, goalSubGoalRepository } from '@/app/db/repositories/goal-lifecycle.repository';
import type { DbGoal, GoalSignalType } from '@/app/db/models/types';
import { logger } from '@/lib/logger';

// Re-export extracted modules so existing callers don't break
export { SIGNAL_WEIGHTS, calculateProgressDelta } from './signalWeighting';
export { computeInferredProgress } from './progressCalculator';
export { findMatchingGoals, applyStatusTransition } from './transitionRules';

// Import for internal use
import { SIGNAL_WEIGHTS, calculateProgressDelta } from './signalWeighting';
import { computeInferredProgress } from './progressCalculator';
import { findMatchingGoals, applyStatusTransition } from './transitionRules';

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

    // Wrap signal creation + progress update + status transition in a single
    // transaction to prevent concurrent signals from interleaving reads/writes
    const db = getDatabase();
    const processAll = db.transaction(() => {
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
    });
    processAll();
  } catch (error) {
    logger.error('[GoalLifecycle] Error processing signal:', { error, input });
  }

  return result;
}

/**
 * Get full lifecycle status for a goal
 */
export function getGoalLifecycleStatus(goalId: string): GoalLifecycleStatus | null {
  const goal = goalRepository.getGoalById(goalId);
  if (!goal) return null;

  const signals = goalSignalRepository.getByGoal(goalId, 50);
  const subGoals = goalSubGoalRepository.getByParent(goalId);

  // Derive stats from already-fetched subGoals list instead of a separate DB query
  const subGoalStats = {
    total: subGoals.length,
    done: subGoals.filter(sg => sg.status === 'done').length,
    inProgress: subGoals.filter(sg => sg.status === 'in_progress').length,
    open: subGoals.filter(sg => sg.status === 'open').length,
  };

  const signalCounts = goalSignalRepository.getSignalCounts(goalId);
  const progress = goal.progress || 0;

  const shouldAutoComplete = goal.lifecycle_status === 'auto_completed'
    || (progress >= 90 && (subGoalStats.total === 0 || subGoalStats.done === subGoalStats.total));

  return {
    goal,
    signals,
    subGoals,
    subGoalStats,
    inferredProgress: progress,
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
  isBlocked: boolean;
  blockedBy: Array<{ goalId: string; title: string; status: string }>;
  blocks: Array<{ goalId: string; title: string; status: string }>;
}> {
  const goals = goalRepository.getGoalsByProject(projectId);
  if (goals.length === 0) return [];

  // Batch-fetch all sub-goal stats in a single query instead of N+1
  const goalIds = goals.map(g => g.id);
  const allSubStats = goalSubGoalRepository.getStatsBatch(goalIds);
  const defaultStats = { total: 0, done: 0, inProgress: 0, open: 0 };

  // Fetch all dependency info for the project in one query
  const blockedGoals = goalDependencyRepository.getBlockedGoals(projectId);
  const allDeps = goalDependencyRepository.getByProject(projectId);

  // Build lookup maps for blocked-by and blocks relationships
  const blockedByMap = new Map<string, Array<{ goalId: string; title: string; status: string }>>();
  const blocksMap = new Map<string, Array<{ goalId: string; title: string; status: string }>>();

  for (const dep of allDeps) {
    if (dep.relationship_type !== 'blocks') continue;

    // child is blocked by parent
    const existing = blockedByMap.get(dep.child_goal_id) || [];
    existing.push({ goalId: dep.parent_goal_id, title: dep.parent_title, status: dep.parent_status });
    blockedByMap.set(dep.child_goal_id, existing);

    // parent blocks child
    const existingBlocks = blocksMap.get(dep.parent_goal_id) || [];
    existingBlocks.push({ goalId: dep.child_goal_id, title: dep.child_title, status: dep.child_status });
    blocksMap.set(dep.parent_goal_id, existingBlocks);
  }

  // Set of goal IDs that are actively blocked (parent not done, child is active)
  const activelyBlockedIds = new Set(blockedGoals.map(b => b.blocked_goal_id));

  return goals.map(goal => {
    const subStats = allSubStats.get(goal.id) || defaultStats;
    const progress = goal.progress || 0;
    const signalCount = goal.signal_count || 0;

    return {
      goalId: goal.id,
      title: goal.title,
      status: goal.status,
      lifecycleStatus: goal.lifecycle_status || 'manual',
      inferredProgress: progress,
      signalCount,
      subGoalCount: subStats.total,
      subGoalsDone: subStats.done,
      shouldAutoComplete: goal.lifecycle_status === 'auto_completed'
        || (progress >= 90 && (subStats.total === 0 || subStats.done === subStats.total)),
      lastSignalAt: goal.last_signal_at || null,
      isBlocked: activelyBlockedIds.has(goal.id),
      blockedBy: blockedByMap.get(goal.id) || [],
      blocks: blocksMap.get(goal.id) || [],
    };
  });
}

/**
 * Manually confirm auto-completion of a goal
 */
export function confirmGoalCompletion(goalId: string): DbGoal | null {
  const goal = goalRepository.getGoalById(goalId);
  if (!goal) return null;

  goalSignalRepository.create({
    goal_id: goalId,
    project_id: goal.project_id,
    signal_type: 'manual_update',
    description: 'Goal manually confirmed as complete',
    progress_delta: 100,
  });

  return goalRepository.updateGoal(goalId, { status: 'done' });
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
    const goals = goalRepository.getGoalsByProject(projectId);
    const activeGoals = goals.filter(g => g.status === 'open' || g.status === 'in_progress');

    for (const goal of activeGoals) {
      if (!goal.context_id) continue;

      // Check for implementation logs in this context that aren't signaled yet
      const contextLogs = implementationLogRepository.getLogsByContext(goal.context_id);
      const existingSignals = goalSignalRepository.getByGoal(goal.id);
      const existingSourceIds = new Set(existingSignals.map(s => s.source_id).filter(Boolean));

      let goalSignalsCreated = 0;

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
        goalSignalsCreated++;
      }

      if (goalSignalsCreated > 0) {
        computeInferredProgress(goal.id);
        signalsCreated += goalSignalsCreated;
        goalsUpdated++;
      }
    }
  } catch (error) {
    logger.error('[GoalLifecycle] Error catching up progress:', { error, projectId });
  }

  return { goalsUpdated, signalsCreated };
}
