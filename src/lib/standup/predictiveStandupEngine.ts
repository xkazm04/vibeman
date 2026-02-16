/**
 * Predictive Standup Engine
 * Evolves the standup from retrospective summary into prescriptive intelligence.
 * Predicts which goals are at risk, which contexts need attention,
 * optimal task ordering, and proactive blocker detection.
 */

import {
  goalDb,
  goalSignalDb,
  implementationLogDb,
  behavioralSignalDb,
  contextDb,
  ideaDb,
} from '@/app/db';
import { getBehavioralContext } from '@/lib/brain/behavioralContext';
import { logger } from '@/lib/logger';
import type {
  PredictiveStandupData,
  GoalRiskAssessment,
  ContextDecayAlert,
  TaskRecommendation,
  PredictedBlocker,
  VelocityComparison,
  VelocityMetrics,
} from '@/app/db/models/standup.types';

// ──────────────────────────────────────────────
// Main Entry Point
// ──────────────────────────────────────────────

export function generatePredictiveStandup(projectId: string): PredictiveStandupData {
  try {
    const goalsAtRisk = assessGoalRisks(projectId);
    const contextDecayAlerts = detectContextDecay(projectId);
    const velocityComparison = computeVelocityComparison(projectId);
    const predictedBlockers = detectPredictedBlockers(projectId, goalsAtRisk);
    const recommendedTaskOrder = buildTaskRecommendations(
      projectId,
      goalsAtRisk,
      contextDecayAlerts,
      velocityComparison
    );
    const missionBriefing = composeMissionBriefing(
      goalsAtRisk,
      contextDecayAlerts,
      recommendedTaskOrder,
      velocityComparison
    );

    return {
      goalsAtRisk,
      contextDecayAlerts,
      recommendedTaskOrder,
      predictedBlockers,
      velocityComparison,
      missionBriefing,
    };
  } catch (error) {
    logger.error('[PredictiveStandup] Error generating predictions:', { error });
    return {
      goalsAtRisk: [],
      contextDecayAlerts: [],
      recommendedTaskOrder: [],
      predictedBlockers: [],
      velocityComparison: emptyVelocityComparison(),
      missionBriefing: 'Unable to generate predictions. Check project data.',
    };
  }
}

// ──────────────────────────────────────────────
// Goal Risk Assessment
// ──────────────────────────────────────────────

function assessGoalRisks(projectId: string): GoalRiskAssessment[] {
  const goals = goalDb.getGoalsByProject(projectId);
  const activeGoals = goals.filter(g => g.status === 'open' || g.status === 'in_progress');
  const now = Date.now();

  return activeGoals.map(goal => {
    const signals = goalSignalDb.getByGoal(goal.id, 20);
    const lastSignalAt = goal.last_signal_at
      ? new Date(goal.last_signal_at).getTime()
      : goal.created_at
        ? new Date(goal.created_at).getTime()
        : now;
    const daysSinceActivity = Math.floor((now - lastSignalAt) / (1000 * 60 * 60 * 24));
    const progress = goal.inferred_progress || goal.progress || 0;

    // Compute velocity trend from signal timestamps
    const velocityTrend = computeGoalVelocityTrend(signals);

    // Risk assessment
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
  }).sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  });
}

function computeGoalVelocityTrend(
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
// Context Decay Detection
// ──────────────────────────────────────────────

function detectContextDecay(projectId: string): ContextDecayAlert[] {
  const alerts: ContextDecayAlert[] = [];

  try {
    const contextActivity = behavioralSignalDb.getContextActivity(projectId, 14);
    const recentActivity = behavioralSignalDb.getContextActivity(projectId, 3);
    const contexts = contextDb.getContextsByProject(projectId);
    const goals = goalDb.getGoalsByProject(projectId);
    const activeGoalContextIds = new Set(
      goals
        .filter(g => g.status === 'open' || g.status === 'in_progress')
        .map(g => g.context_id)
        .filter(Boolean)
    );

    // Build lookup for 14-day activity
    const activityMap = new Map<string, number>();
    for (const ca of contextActivity) {
      if (ca.context_id) activityMap.set(ca.context_id, ca.total_weight);
    }

    // Build lookup for 3-day activity
    const recentMap = new Map<string, number>();
    for (const ca of recentActivity) {
      if (ca.context_id) recentMap.set(ca.context_id, ca.total_weight);
    }

    for (const ctx of contexts) {
      const weight14d = activityMap.get(ctx.id) || 0;
      const weight3d = recentMap.get(ctx.id) || 0;
      const linkedToActiveGoals = activeGoalContextIds.has(ctx.id);

      // Compute decay: if 14-day weight is high but 3-day weight is low, context is decaying
      const decayPercent = weight14d > 0
        ? Math.round(Math.max(0, 100 - (weight3d / weight14d) * 100))
        : 0;

      let urgency: ContextDecayAlert['urgency'] = 'info';
      let suggestion = '';

      if (decayPercent >= 80 && linkedToActiveGoals) {
        urgency = 'critical';
        suggestion = `This context has active goals but no recent activity. Resume work here.`;
      } else if (decayPercent >= 60 && linkedToActiveGoals) {
        urgency = 'warning';
        suggestion = `Activity is declining in this context. Consider scheduling focused time.`;
      } else if (decayPercent >= 80) {
        urgency = 'warning';
        suggestion = `No recent work here. Check if this area needs attention.`;
      } else {
        continue; // Skip low-decay contexts
      }

      alerts.push({
        contextId: ctx.id,
        contextName: ctx.name,
        decayPercent,
        lastActivityDate: null, // Would need per-context signal lookup
        linkedToActiveGoals,
        urgency,
        suggestion,
      });
    }
  } catch (error) {
    logger.warn('[PredictiveStandup] Context decay detection error:', { error });
  }

  return alerts.sort((a, b) => {
    const urgencyOrder = { critical: 0, warning: 1, info: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });
}

// ──────────────────────────────────────────────
// Velocity Comparison
// ──────────────────────────────────────────────

function computeVelocityComparison(projectId: string): VelocityComparison {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const currentPeriod = computePeriodVelocity(projectId, weekAgo, now);
  const previousPeriod = computePeriodVelocity(projectId, twoWeeksAgo, weekAgo);

  // Compute composite velocity score
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

function computePeriodVelocity(
  projectId: string,
  start: Date,
  end: Date
): VelocityMetrics {
  const startISO = start.toISOString();
  const endISO = end.toISOString();
  const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  // SQL-filtered counts — no client-side date filtering needed
  const logCount = implementationLogDb.countLogsByProjectInRange(projectId, startISO, endISO);
  const periodAccepted = ideaDb.countIdeasByProjectInRange(projectId, startISO, endISO, 'accepted');

  // Behavioral signals in exact date range (SQL-filtered)
  const periodSignals = behavioralSignalDb.getByTypeAndRange(projectId, 'implementation', startISO, endISO);

  // Average task duration from implementation signals
  let totalDuration = 0;
  let durationCount = 0;
  let successCount = 0;
  for (const sig of periodSignals) {
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
    ideasAcceptedPerDay: Math.round((periodAccepted / days) * 10) / 10,
    signalsPerDay: Math.round((periodSignals.length / days) * 10) / 10,
    avgTaskDurationMinutes: durationCount > 0
      ? Math.round(totalDuration / durationCount / 60000)
      : 0,
    successRate: periodSignals.length > 0
      ? Math.round((successCount / periodSignals.length) * 100)
      : 0,
  };
}

// ──────────────────────────────────────────────
// Predicted Blockers
// ──────────────────────────────────────────────

function detectPredictedBlockers(
  projectId: string,
  goalsAtRisk: GoalRiskAssessment[]
): PredictedBlocker[] {
  const blockers: PredictedBlocker[] = [];
  const behavioralCtx = getBehavioralContext(projectId, 7);

  // 1. Stalled goals blocking downstream work
  const stalledGoals = goalsAtRisk.filter(g => g.velocityTrend === 'stalled');
  if (stalledGoals.length > 0) {
    blockers.push({
      title: `${stalledGoals.length} goal${stalledGoals.length > 1 ? 's' : ''} stalled`,
      description: `The following goals have no recent activity: ${stalledGoals.map(g => g.goalTitle).join(', ')}`,
      affectedGoals: stalledGoals.map(g => g.goalTitle),
      severity: 'critical',
      preventiveAction: 'Break stalled goals into smaller tasks or reassess their priority',
      confidence: 85,
    });
  }

  // 2. High revert rate suggests quality issues
  if (behavioralCtx.hasData && behavioralCtx.patterns.revertedCount > 2) {
    blockers.push({
      title: 'Quality degradation risk',
      description: `${behavioralCtx.patterns.revertedCount} implementations were reverted recently. This suggests rushing or insufficient testing.`,
      affectedGoals: goalsAtRisk.filter(g => g.riskLevel !== 'low').map(g => g.goalTitle),
      severity: 'warning',
      preventiveAction: 'Slow down and add testing before implementing. Review reverted changes for patterns.',
      confidence: 70,
    });
  }

  // 3. Untested implementation backlog
  try {
    const untested = implementationLogDb.getUntestedLogsByProject(projectId);
    if (untested.length > 5) {
      blockers.push({
        title: `${untested.length} untested implementations`,
        description: 'A growing backlog of untested implementations increases regression risk.',
        affectedGoals: [],
        severity: 'warning',
        preventiveAction: `Dedicate time to testing the ${untested.length} pending implementations`,
        confidence: 80,
      });
    }
  } catch { /* silent */ }

  return blockers.sort((a, b) => {
    const order = { critical: 0, warning: 1 };
    return order[a.severity] - order[b.severity];
  });
}

// ──────────────────────────────────────────────
// Task Recommendations
// ──────────────────────────────────────────────

function buildTaskRecommendations(
  projectId: string,
  goalsAtRisk: GoalRiskAssessment[],
  contextAlerts: ContextDecayAlert[],
  velocity: VelocityComparison
): TaskRecommendation[] {
  const tasks: TaskRecommendation[] = [];

  // 1. High-risk goals get top priority (morning - fresh mind for hard problems)
  for (const goal of goalsAtRisk.filter(g => g.riskLevel === 'high').slice(0, 2)) {
    tasks.push({
      title: `Work on: ${goal.goalTitle}`,
      reason: goal.riskReason,
      goalId: goal.goalId,
      priorityScore: 100,
      estimatedComplexity: 'heavy',
      suggestedSlot: 'morning',
    });
  }

  // 2. Critical context decay alerts (morning - focused attention)
  for (const alert of contextAlerts.filter(a => a.urgency === 'critical').slice(0, 1)) {
    tasks.push({
      title: `Resume work in ${alert.contextName}`,
      reason: alert.suggestion,
      contextId: alert.contextId,
      contextName: alert.contextName,
      priorityScore: 90,
      estimatedComplexity: 'medium',
      suggestedSlot: 'morning',
    });
  }

  // 3. Medium-risk goals (afternoon - lighter cognitive load)
  for (const goal of goalsAtRisk.filter(g => g.riskLevel === 'medium').slice(0, 2)) {
    tasks.push({
      title: `Progress on: ${goal.goalTitle}`,
      reason: goal.riskReason,
      goalId: goal.goalId,
      priorityScore: 70,
      estimatedComplexity: 'medium',
      suggestedSlot: 'afternoon',
    });
  }

  // 4. Untested implementations (afternoon - systematic work)
  try {
    const untested = implementationLogDb.getUntestedLogsByProject(projectId);
    if (untested.length > 0) {
      tasks.push({
        title: `Test ${Math.min(untested.length, 3)} untested implementations`,
        reason: `${untested.length} implementations awaiting verification`,
        priorityScore: 60,
        estimatedComplexity: 'light',
        suggestedSlot: 'afternoon',
      });
    }
  } catch { /* silent */ }

  // 5. Warning context alerts (anytime - lower urgency)
  for (const alert of contextAlerts.filter(a => a.urgency === 'warning').slice(0, 1)) {
    tasks.push({
      title: `Review ${alert.contextName}`,
      reason: alert.suggestion,
      contextId: alert.contextId,
      contextName: alert.contextName,
      priorityScore: 40,
      estimatedComplexity: 'light',
      suggestedSlot: 'anytime',
    });
  }

  // 6. If velocity is decelerating, suggest a scan to find new opportunities
  if (velocity.trend === 'decelerating') {
    tasks.push({
      title: 'Run a fresh project scan',
      reason: 'Velocity is declining - a scan may surface new improvement opportunities',
      priorityScore: 30,
      estimatedComplexity: 'light',
      suggestedSlot: 'anytime',
    });
  }

  return tasks.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 8);
}

// ──────────────────────────────────────────────
// Mission Briefing
// ──────────────────────────────────────────────

function composeMissionBriefing(
  goalsAtRisk: GoalRiskAssessment[],
  contextAlerts: ContextDecayAlert[],
  tasks: TaskRecommendation[],
  velocity: VelocityComparison
): string {
  const parts: string[] = [];

  // Velocity summary
  const trendEmoji = velocity.trend === 'accelerating' ? 'up'
    : velocity.trend === 'decelerating' ? 'slowing' : 'steady';
  parts.push(
    `Velocity is ${trendEmoji} (${velocity.percentChange > 0 ? '+' : ''}${velocity.percentChange}% vs last week). ` +
    `You're averaging ${velocity.currentPeriod.implementationsPerDay} implementations/day.`
  );

  // Risk alerts
  const highRisk = goalsAtRisk.filter(g => g.riskLevel === 'high');
  const mediumRisk = goalsAtRisk.filter(g => g.riskLevel === 'medium');
  if (highRisk.length > 0) {
    parts.push(
      `${highRisk.length} goal${highRisk.length > 1 ? 's are' : ' is'} at risk of stalling: ${highRisk.map(g => g.goalTitle).join(', ')}.`
    );
  }
  if (mediumRisk.length > 0) {
    parts.push(`${mediumRisk.length} goal${mediumRisk.length > 1 ? 's need' : ' needs'} attention.`);
  }

  // Context health
  const criticalContexts = contextAlerts.filter(a => a.urgency === 'critical');
  if (criticalContexts.length > 0) {
    parts.push(
      `Context${criticalContexts.length > 1 ? 's' : ''} losing momentum: ${criticalContexts.map(a => a.contextName).join(', ')}.`
    );
  }

  // Top recommendation
  if (tasks.length > 0) {
    parts.push(`Start your day with: ${tasks[0].title}.`);
  }

  return parts.join(' ');
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function emptyVelocityComparison(): VelocityComparison {
  const empty: VelocityMetrics = {
    implementationsPerDay: 0,
    ideasAcceptedPerDay: 0,
    signalsPerDay: 0,
    avgTaskDurationMinutes: 0,
    successRate: 0,
  };
  return { currentPeriod: empty, previousPeriod: empty, trend: 'steady', percentChange: 0 };
}
