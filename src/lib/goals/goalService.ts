/**
 * Goal Service Layer
 *
 * Pure business logic for goal completion checking and candidate management,
 * extracted from API route handlers for testability and reuse.
 */

import { goalDb, implementationLogDb, contextDb } from '@/app/db';
import { goalCandidateRepository } from '@/app/db/repositories/goal-candidate.repository';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { getDatabase } from '@/app/db/connection';
import { processSignal } from '@/lib/goals/goalLifecycleEngine';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';

// ── Types ──

export interface CompletionCheckResult {
  matched: number;
  goalIds: string[];
  progress: number;
}

export interface CompletionSuggestion {
  goalId: string;
  goalTitle: string;
  contextId: string;
  contextName: string | null;
  implementationCount: number;
  testedCount: number;
  progress: number;
  latestLogTitle: string | null;
}

export interface CandidateAcceptResult {
  goal: ReturnType<typeof goalRepository.createGoal>;
  updatedCandidate: ReturnType<typeof goalCandidateRepository.updateCandidate>;
}

// ── Progress Calculation ──

/**
 * Calculate goal progress from implementation log counts.
 *
 * Formula: base 10% + 80% scaled by tested/total ratio, capped at 90%.
 * Only manual completion reaches 100%.
 */
export function calculateGoalProgress(testedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.min(Math.round((testedCount / Math.max(totalCount, 1)) * 80 + 10), 90);
}

// ── Goal Completion Checking ──

/**
 * Check and update goal progress when an implementation log is created.
 * Finds active goals linked to the context, updates their progress,
 * and feeds the lifecycle engine.
 */
export function checkGoalCompletion(
  contextId: string,
  projectId: string,
  logTitle?: string
): CompletionCheckResult {
  const matchingGoals = goalDb.getActiveGoalsByContextId(contextId);

  if (matchingGoals.length === 0) {
    return { matched: 0, goalIds: [], progress: 0 };
  }

  const contextLogs = implementationLogDb.getLogsByContext(contextId);
  const testedCount = contextLogs.filter(l => l.tested === 1).length;
  const totalCount = contextLogs.length;
  const progress = calculateGoalProgress(testedCount, totalCount);

  const updatedGoals: string[] = [];

  for (const goal of matchingGoals) {
    if (goal.status === 'open') {
      goalDb.updateGoal(goal.id, { status: 'in_progress' });
    }
    goalDb.updateGoalProgress(goal.id, progress);
    updatedGoals.push(goal.id);
  }

  // Feed into lifecycle engine (non-blocking)
  try {
    processSignal({
      projectId,
      signalType: 'implementation_log',
      contextId,
      sourceTitle: logTitle,
      description: `Implementation log created in context`,
      metadata: { totalLogs: totalCount, testedLogs: testedCount },
    });
  } catch (e) {
    logger.warn('Lifecycle engine signal failed:', { error: e });
  }

  logger.info('Goal-implementation link updated', {
    contextId,
    matchedGoals: updatedGoals.length,
    progress,
    totalLogs: totalCount,
    testedLogs: testedCount,
  });

  return { matched: updatedGoals.length, goalIds: updatedGoals, progress };
}

/**
 * Get completion suggestions for in-progress goals with recent implementation logs.
 * Returns goals sorted by progress descending (most likely to complete first).
 */
export function getCompletionSuggestions(projectId: string): CompletionSuggestion[] {
  const goals = goalDb.getGoalsByProject(projectId);
  const inProgressGoals = goals.filter(
    g => (g.status === 'in_progress' || g.status === 'open') && g.context_id
  );

  const suggestions: CompletionSuggestion[] = [];

  for (const goal of inProgressGoals) {
    if (!goal.context_id) continue;

    const contextLogs = implementationLogDb.getLogsByContext(goal.context_id);
    if (contextLogs.length === 0) continue;

    const context = contextDb.getContextById(goal.context_id);
    const testedCount = contextLogs.filter(l => l.tested === 1).length;

    suggestions.push({
      goalId: goal.id,
      goalTitle: goal.title,
      contextId: goal.context_id,
      contextName: context?.name || null,
      implementationCount: contextLogs.length,
      testedCount,
      progress: goal.progress || 0,
      latestLogTitle: contextLogs[0]?.title || null,
    });
  }

  suggestions.sort((a, b) => b.progress - a.progress);
  return suggestions;
}

// ── Candidate Management ──

/**
 * Accept a goal candidate: creates a real goal from the candidate in a transaction.
 */
export function acceptCandidate(
  candidateId: string,
  updates?: { title?: string; description?: string }
): CandidateAcceptResult | null {
  const candidate = goalCandidateRepository.getCandidateById(candidateId);
  if (!candidate) return null;

  const db = getDatabase();
  const runAccept = db.transaction(() => {
    const maxOrderIndex = goalRepository.getMaxOrderIndex(candidate.project_id);

    const goal = goalRepository.createGoal({
      id: randomUUID(),
      project_id: candidate.project_id,
      context_id: candidate.context_id || undefined,
      title: updates?.title || candidate.title,
      description: updates?.description || candidate.description || undefined,
      status: candidate.suggested_status,
      order_index: maxOrderIndex + 1,
    });

    const updatedCandidate = goalCandidateRepository.updateCandidate(candidateId, {
      user_action: 'accepted',
      goal_id: goal.id,
      title: updates?.title,
      description: updates?.description,
    });

    return { goal, updatedCandidate };
  });

  return runAccept();
}

/**
 * Reject a goal candidate with optional reason.
 */
export function rejectCandidate(candidateId: string, rejectionReason?: string) {
  return goalCandidateRepository.updateCandidate(candidateId, {
    user_action: 'rejected',
    rejection_reason: rejectionReason || null,
  });
}

/**
 * Tweak a goal candidate (mark as tweaked with field updates).
 */
export function tweakCandidate(candidateId: string, updates: Record<string, unknown>) {
  return goalCandidateRepository.updateCandidate(candidateId, {
    user_action: 'tweaked',
    ...updates,
  });
}
