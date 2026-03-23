/**
 * Unified Signal Processor
 *
 * Centralizes signal-to-progress computation, velocity trends, and risk
 * assessment. All consumers share these methods instead of computing
 * independently, ensuring consistent results and a single invalidation point.
 */

import {
  goalDb,
  goalSignalDb,
  implementationLogDb,
  behavioralSignalDb,
  ideaDb,
} from '@/app/db';
import type {
  GoalRiskAssessment,
  VelocityComparison,
  VelocityMetrics,
} from '@/app/db/models/standup.types';
import type { CollectedStandupData } from '@/lib/standup/standupDataCollector';
import { logger } from '@/lib/logger';

// ──────────────────────────────────────────────
// Velocity Trend (per-goal, from signals)
// ──────────────────────────────────────────────

/**
 * Compute velocity trend for a single goal based on its recent signal cadence.
 * Compares last-7-day signal count against 7–14-day count.
 */
export function computeGoalVelocityTrend(
  signals: Array<{ created_at: string }>
): GoalRiskAssessment['velocityTrend'] {
  if (signals.length < 2) return 'stalled';

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

  const recentSignals = signals.filter(s => new Date(s.created_at).getTime() >= weekAgo).length;
  const priorSignals = signals.filter(s => {
    const t = new Date(s.created_at).getTime();
    return t >= twoWeeksAgo && t < weekAgo;
  }).length;

  if (recentSignals === 0) return 'stalled';
  if (priorSignals === 0) return 'accelerating';
  const ratio = recentSignals / priorSignals;
  if (ratio > 1.3) return 'accelerating';
  if (ratio < 0.7) return 'slowing';
  return 'steady';
}

// ──────────────────────────────────────────────
// Single-Goal Risk Assessment
// ──────────────────────────────────────────────

interface GoalLike {
  id: string;
  title: string;
  status: string;
  last_signal_at?: string | null;
  created_at?: string | null;
  inferred_progress?: number | null;
  progress?: number | null;
}

/**
 * Assess risk for a single goal given its metadata and signals.
 */
export function assessSingleGoalRisk(
  goal: GoalLike,
  signals: Array<{ created_at: string }>,
  now: number = Date.now()
): GoalRiskAssessment {
  const lastSignalAt = goal.last_signal_at
    ? new Date(goal.last_signal_at).getTime()
    : goal.created_at
      ? new Date(goal.created_at).getTime()
      : now;
  const daysSinceActivity = Math.floor((now - lastSignalAt) / (1000 * 60 * 60 * 24));
  const progress = goal.inferred_progress || goal.progress || 0;
  const velocityTrend = computeGoalVelocityTrend(signals);

  let riskLevel: GoalRiskAssessment['riskLevel'] = 'low';
  let riskReason = 'On track';
  let suggestedAction = 'Continue current pace';

  if (daysSinceActivity >= 7) {
    riskLevel = 'high';
    riskReason = `No activity for ${daysSinceActivity} days`;
    suggestedAction = 'Prioritize this goal today - it needs immediate attention';
  } else if (daysSinceActivity >= 3 && progress < 50) {
    riskLevel = 'medium';
    riskReason = `${daysSinceActivity} days inactive, only ${progress}% progress`;
    suggestedAction = 'Schedule focused work on this goal';
  } else if (velocityTrend === 'slowing' || velocityTrend === 'stalled') {
    riskLevel = daysSinceActivity >= 2 ? 'medium' : 'low';
    riskReason = `Velocity is ${velocityTrend}`;
    suggestedAction = velocityTrend === 'stalled'
      ? 'Break this goal into smaller sub-tasks'
      : 'Increase focus to maintain momentum';
  }

  return {
    goalId: goal.id,
    goalTitle: goal.title,
    status: goal.status,
    progress,
    daysSinceActivity,
    velocityTrend,
    riskLevel,
    riskReason,
    suggestedAction,
  };
}

// ──────────────────────────────────────────────
// Risk for a single goal by ID (DB-backed)
// ──────────────────────────────────────────────

/**
 * Get risk assessment for a single goal, fetching its signals from DB.
 */
export function getGoalRisk(goalId: string): GoalRiskAssessment | null {
  const goal = goalDb.getGoalById(goalId);
  if (!goal) return null;

  const signals = goalSignalDb.getByGoal(goalId, 20);
  return assessSingleGoalRisk(goal, signals);
}

// ──────────────────────────────────────────────
// All Risks (project-level)
// ──────────────────────────────────────────────

function sortByRisk(a: GoalRiskAssessment, b: GoalRiskAssessment): number {
  const riskOrder = { high: 0, medium: 1, low: 2 };
  return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
}

/**
 * Get risk assessments for all active goals in a project.
 */
export function getAllRisks(projectId: string): GoalRiskAssessment[] {
  const goals = goalDb.getGoalsByProject(projectId);
  const activeGoals = goals.filter(g => g.status === 'open' || g.status === 'in_progress');
  const now = Date.now();

  return activeGoals.map(goal => {
    const signals = goalSignalDb.getByGoal(goal.id, 20);
    return assessSingleGoalRisk(goal, signals, now);
  }).sort(sortByRisk);
}

/**
 * Get risk assessments from pre-fetched standup data (no DB calls).
 */
export function getAllRisksFromCollected(collected: CollectedStandupData): GoalRiskAssessment[] {
  const activeGoals = collected.goals.filter(g => g.status === 'open' || g.status === 'in_progress');
  const now = Date.now();

  return activeGoals.map(goal => {
    const signals = collected.goalSignals.get(goal.id) || [];
    return assessSingleGoalRisk(goal, signals, now);
  }).sort(sortByRisk);
}

// ──────────────────────────────────────────────
// Goal Progress (signal-based)
// ──────────────────────────────────────────────

/**
 * Get inferred progress for a goal from its DB record.
 * This is the signal-based progress maintained by the lifecycle engine.
 */
export function getGoalProgress(goalId: string): number {
  const goal = goalDb.getGoalById(goalId);
  if (!goal) return 0;
  return goal.inferred_progress || goal.progress || 0;
}

// ──────────────────────────────────────────────
// Project Velocity Comparison
// ──────────────────────────────────────────────

/**
 * Compute velocity metrics for a date range from raw counts.
 */
export function computeVelocityMetrics(
  logCount: number,
  acceptedCount: number,
  signals: Array<{ data: string }>,
  start: Date,
  end: Date
): VelocityMetrics {
  const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  let totalDuration = 0;
  let durationCount = 0;
  let successCount = 0;
  for (const sig of signals) {
    try {
      const data = JSON.parse(sig.data);
      if (data.executionTimeMs > 0) {
        totalDuration += data.executionTimeMs;
        durationCount++;
      }
      if (data.success) successCount++;
    } catch { /* skip */ }
  }

  return {
    implementationsPerDay: Math.round((logCount / days) * 10) / 10,
    ideasAcceptedPerDay: Math.round((acceptedCount / days) * 10) / 10,
    signalsPerDay: Math.round((signals.length / days) * 10) / 10,
    avgTaskDurationMinutes: durationCount > 0
      ? Math.round(totalDuration / durationCount / 60000)
      : 0,
    successRate: signals.length > 0
      ? Math.round((successCount / signals.length) * 100)
      : 0,
  };
}

/**
 * Finalize a velocity comparison from two period metrics.
 */
export function finalizeVelocityComparison(
  currentPeriod: VelocityMetrics,
  previousPeriod: VelocityMetrics
): VelocityComparison {
  const currentScore = currentPeriod.implementationsPerDay * 2 +
    currentPeriod.signalsPerDay +
    currentPeriod.ideasAcceptedPerDay;
  const previousScore = previousPeriod.implementationsPerDay * 2 +
    previousPeriod.signalsPerDay +
    previousPeriod.ideasAcceptedPerDay;

  let trend: VelocityComparison['trend'] = 'steady';
  let percentChange = 0;

  if (previousScore > 0) {
    percentChange = Math.round(((currentScore - previousScore) / previousScore) * 100);
    if (percentChange > 15) trend = 'accelerating';
    else if (percentChange < -15) trend = 'decelerating';
  } else if (currentScore > 0) {
    trend = 'accelerating';
    percentChange = 100;
  }

  return { currentPeriod, previousPeriod, trend, percentChange };
}

/**
 * Compute project-wide velocity comparison (current week vs previous week).
 * Fetches data from DB.
 */
export function getProjectVelocity(projectId: string): VelocityComparison {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const currentPeriod = computePeriodVelocity(projectId, weekAgo, now);
  const previousPeriod = computePeriodVelocity(projectId, twoWeeksAgo, weekAgo);

  return finalizeVelocityComparison(currentPeriod, previousPeriod);
}

/**
 * Compute project-wide velocity comparison from pre-fetched standup data.
 */
export function getProjectVelocityFromCollected(collected: CollectedStandupData): VelocityComparison {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const currentPeriod = computeVelocityMetrics(
    collected.currentWeekLogCount,
    collected.currentWeekAccepted,
    collected.currentWeekSignals,
    weekAgo, now
  );
  const previousPeriod = computeVelocityMetrics(
    collected.previousWeekLogCount,
    collected.previousWeekAccepted,
    collected.previousWeekSignals,
    twoWeeksAgo, weekAgo
  );

  return finalizeVelocityComparison(currentPeriod, previousPeriod);
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function computePeriodVelocity(
  projectId: string,
  start: Date,
  end: Date
): VelocityMetrics {
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const logCount = implementationLogDb.countLogsByProjectInRange(projectId, startISO, endISO);
  const periodAccepted = ideaDb.countIdeasByProjectInRange(projectId, startISO, endISO, 'accepted');
  const periodSignals = behavioralSignalDb.getByTypeAndRange(projectId, 'implementation', startISO, endISO);

  return computeVelocityMetrics(logCount, periodAccepted, periodSignals, start, end);
}

export function emptyVelocityComparison(): VelocityComparison {
  const empty: VelocityMetrics = {
    implementationsPerDay: 0,
    ideasAcceptedPerDay: 0,
    signalsPerDay: 0,
    avgTaskDurationMinutes: 0,
    successRate: 0,
  };
  return { currentPeriod: empty, previousPeriod: empty, trend: 'steady', percentChange: 0 };
}
