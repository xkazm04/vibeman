/**
 * Predictive Standup Engine
 * Evolves the standup from retrospective summary into prescriptive intelligence.
 * Predicts which goals are at risk, which contexts need attention,
 * optimal task ordering, and proactive blocker detection.
 *
 * Accepts pre-fetched CollectedStandupData from the unified pipeline,
 * or fetches its own data when called standalone (e.g. /api/standup/predict).
 */

import {
  implementationLogDb,
  behavioralSignalDb,
  contextDb,
  goalDb,
} from '@/app/db';
import { getBehavioralContext } from '@/lib/brain/behavioralContext';
import { logger } from '@/lib/logger';
import {
  getAllRisks,
  getAllRisksFromCollected,
  getProjectVelocity,
  getProjectVelocityFromCollected,
  emptyVelocityComparison,
} from '@/lib/goals/signalProcessor';
import type { CollectedStandupData } from './standupDataCollector';
import type {
  PredictiveStandupData,
  GoalRiskAssessment,
  ContextDecayAlert,
  TaskRecommendation,
  PredictedBlocker,
  VelocityComparison,
  GoalTransitionSuggestion,
  GoalTransitionAction,
} from '@/app/db/models/standup.types';

// ──────────────────────────────────────────────
// Main Entry Point
// ──────────────────────────────────────────────

/**
 * Generate predictive standup data.
 * When `collected` is provided, uses pre-fetched data (unified pipeline).
 * When omitted, fetches its own data (standalone /api/standup/predict).
 */
export function generatePredictiveStandup(
  projectId: string,
  collected?: CollectedStandupData
): PredictiveStandupData {
  try {
    const goalsAtRisk = collected
      ? getAllRisksFromCollected(collected)
      : getAllRisks(projectId);
    const contextDecayAlerts = collected
      ? detectContextDecayFromCollected(collected)
      : detectContextDecay(projectId);
    const velocityComparison = collected
      ? getProjectVelocityFromCollected(collected)
      : getProjectVelocity(projectId);
    const predictedBlockers = collected
      ? detectPredictedBlockersFromCollected(collected, goalsAtRisk)
      : detectPredictedBlockers(projectId, goalsAtRisk);
    const recommendedTaskOrder = collected
      ? buildTaskRecommendationsFromCollected(collected, goalsAtRisk, contextDecayAlerts, velocityComparison)
      : buildTaskRecommendations(projectId, goalsAtRisk, contextDecayAlerts, velocityComparison);
    const missionBriefing = composeMissionBriefing(
      goalsAtRisk,
      contextDecayAlerts,
      recommendedTaskOrder,
      velocityComparison
    );
    const goalTransitionSuggestions = generateTransitionSuggestions(goalsAtRisk);

    return {
      goalsAtRisk,
      contextDecayAlerts,
      recommendedTaskOrder,
      predictedBlockers,
      velocityComparison,
      missionBriefing,
      goalTransitionSuggestions,
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
      goalTransitionSuggestions: [],
    };
  }
}

// ──────────────────────────────────────────────
// Goal Risk Assessment
// ──────────────────────────────────────────────

// Risk assessment delegates to the unified SignalProcessor.
// assessSingleGoalRisk, getAllRisks, getAllRisksFromCollected are imported above.

// ──────────────────────────────────────────────
// Context Decay Detection
// ──────────────────────────────────────────────

function detectContextDecayFromCollected(collected: CollectedStandupData): ContextDecayAlert[] {
  const STALE_WEIGHT_THRESHOLD = 3;
  const alerts: ContextDecayAlert[] = [];

  try {
    const activeGoalContextIds = new Set(
      collected.goals
        .filter(g => g.status === 'open' || g.status === 'in_progress')
        .map(g => g.context_id)
        .filter(Boolean)
    );

    const activityMap = new Map<string, number>();
    for (const ca of collected.contextActivity14d) {
      if (ca.context_id) activityMap.set(ca.context_id, ca.total_weight);
    }

    const recentMap = new Map<string, number>();
    for (const ca of collected.contextActivity3d) {
      if (ca.context_id) recentMap.set(ca.context_id, ca.total_weight);
    }

    // Use contexts from sourceData (already fetched)
    for (const ctx of collected.sourceData.contexts) {
      const weight14d = activityMap.get(ctx.id) || 0;
      const weight3d = recentMap.get(ctx.id) || 0;
      const linkedToActiveGoals = activeGoalContextIds.has(ctx.id);

      const { decayPercent, decayStatus } = classifyContextHealth(weight14d, weight3d, STALE_WEIGHT_THRESHOLD);

      const alert = buildContextAlert(ctx.id, ctx.name, decayPercent, decayStatus, linkedToActiveGoals);
      if (alert) alerts.push(alert);
    }
  } catch (error) {
    logger.warn('[PredictiveStandup] Context decay detection error:', { error });
  }

  return alerts.sort(sortByUrgency);
}

function detectContextDecay(projectId: string): ContextDecayAlert[] {
  const alerts: ContextDecayAlert[] = [];
  const STALE_WEIGHT_THRESHOLD = 3;

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

    const activityMap = new Map<string, number>();
    for (const ca of contextActivity) {
      if (ca.context_id) activityMap.set(ca.context_id, ca.total_weight);
    }

    const recentMap = new Map<string, number>();
    for (const ca of recentActivity) {
      if (ca.context_id) recentMap.set(ca.context_id, ca.total_weight);
    }

    for (const ctx of contexts) {
      const weight14d = activityMap.get(ctx.id) || 0;
      const weight3d = recentMap.get(ctx.id) || 0;
      const linkedToActiveGoals = activeGoalContextIds.has(ctx.id);

      const { decayPercent, decayStatus } = classifyContextHealth(weight14d, weight3d, STALE_WEIGHT_THRESHOLD);

      const alert = buildContextAlert(ctx.id, ctx.name, decayPercent, decayStatus, linkedToActiveGoals);
      if (alert) alerts.push(alert);
    }
  } catch (error) {
    logger.warn('[PredictiveStandup] Context decay detection error:', { error });
  }

  return alerts.sort(sortByUrgency);
}

function buildContextAlert(
  contextId: string,
  contextName: string,
  decayPercent: number,
  decayStatus: ContextDecayAlert['decayStatus'],
  linkedToActiveGoals: boolean
): ContextDecayAlert | null {
  let urgency: ContextDecayAlert['urgency'] = 'info';
  let suggestion = '';

  if (decayStatus === 'stale' && linkedToActiveGoals) {
    urgency = 'critical';
    suggestion = 'This context has active goals but negligible activity. Resume work here.';
  } else if (decayStatus === 'stale') {
    urgency = 'warning';
    suggestion = 'Negligible activity detected. Check if this area still needs attention.';
  } else if (decayStatus === 'decaying' && linkedToActiveGoals) {
    urgency = decayPercent >= 80 ? 'critical' : 'warning';
    suggestion = 'Activity is declining in this context. Consider scheduling focused time.';
  } else if (decayStatus === 'decaying') {
    urgency = decayPercent >= 80 ? 'warning' : 'info';
    suggestion = 'Recent work has dropped off. Check if this area needs attention.';
  } else {
    return null;
  }

  return {
    contextId,
    contextName,
    decayPercent,
    decayStatus,
    lastActivityDate: null,
    linkedToActiveGoals,
    urgency,
    suggestion,
  };
}

function sortByUrgency(a: ContextDecayAlert, b: ContextDecayAlert): number {
  const urgencyOrder = { critical: 0, warning: 1, info: 2 };
  return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
}

/**
 * Classify context health using dual-axis analysis.
 */
function classifyContextHealth(
  weight14d: number,
  weight3d: number,
  staleThreshold: number
): { decayPercent: number; decayStatus: ContextDecayAlert['decayStatus'] } {
  if (weight14d < staleThreshold) {
    return { decayPercent: 95, decayStatus: 'stale' };
  }

  const rate3d = weight3d / 3;
  const rate14d = weight14d / 14;

  if (rate14d === 0) {
    return { decayPercent: 95, decayStatus: 'stale' };
  }

  const trendRatio = rate3d / rate14d;

  if (trendRatio >= 1.3) {
    return { decayPercent: 0, decayStatus: 'growing' };
  }

  if (trendRatio >= 0.7) {
    return { decayPercent: Math.round((1 - trendRatio) * 100), decayStatus: 'healthy' };
  }

  const decayPercent = Math.round(Math.min(100, (1 - trendRatio) * 100));
  return { decayPercent, decayStatus: 'decaying' };
}

// ──────────────────────────────────────────────
// Velocity Comparison
// ──────────────────────────────────────────────

// Velocity comparison delegates to the unified SignalProcessor.
// getProjectVelocity, getProjectVelocityFromCollected are imported above.

// ──────────────────────────────────────────────
// Predicted Blockers
// ──────────────────────────────────────────────

function detectPredictedBlockersFromCollected(
  collected: CollectedStandupData,
  goalsAtRisk: GoalRiskAssessment[]
): PredictedBlocker[] {
  return buildBlockerList(goalsAtRisk, collected.behavioralContext, collected.untestedLogs);
}

function detectPredictedBlockers(
  projectId: string,
  goalsAtRisk: GoalRiskAssessment[]
): PredictedBlocker[] {
  const behavioralCtx = getBehavioralContext(projectId, 7);
  let untestedLogs: Array<{ id: string }> = [];
  try {
    untestedLogs = implementationLogDb.getUntestedLogsByProject(projectId);
  } catch { /* silent */ }

  return buildBlockerList(goalsAtRisk, behavioralCtx, untestedLogs);
}

function buildBlockerList(
  goalsAtRisk: GoalRiskAssessment[],
  behavioralCtx: ReturnType<typeof getBehavioralContext>,
  untestedLogs: Array<{ id: string }>
): PredictedBlocker[] {
  const blockers: PredictedBlocker[] = [];

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

  if (untestedLogs.length > 5) {
    blockers.push({
      title: `${untestedLogs.length} untested implementations`,
      description: 'A growing backlog of untested implementations increases regression risk.',
      affectedGoals: [],
      severity: 'warning',
      preventiveAction: `Dedicate time to testing the ${untestedLogs.length} pending implementations`,
      confidence: 80,
    });
  }

  return blockers.sort((a, b) => {
    const order = { critical: 0, warning: 1 };
    return order[a.severity] - order[b.severity];
  });
}

// ──────────────────────────────────────────────
// Task Recommendations
// ──────────────────────────────────────────────

function buildTaskRecommendationsFromCollected(
  collected: CollectedStandupData,
  goalsAtRisk: GoalRiskAssessment[],
  contextAlerts: ContextDecayAlert[],
  velocity: VelocityComparison
): TaskRecommendation[] {
  return buildTaskList(goalsAtRisk, contextAlerts, velocity, collected.untestedLogs);
}

function buildTaskRecommendations(
  projectId: string,
  goalsAtRisk: GoalRiskAssessment[],
  contextAlerts: ContextDecayAlert[],
  velocity: VelocityComparison
): TaskRecommendation[] {
  let untestedLogs: Array<{ id: string }> = [];
  try {
    untestedLogs = implementationLogDb.getUntestedLogsByProject(projectId);
  } catch { /* silent */ }

  return buildTaskList(goalsAtRisk, contextAlerts, velocity, untestedLogs);
}

function buildTaskList(
  goalsAtRisk: GoalRiskAssessment[],
  contextAlerts: ContextDecayAlert[],
  velocity: VelocityComparison,
  untestedLogs: Array<{ id: string }>
): TaskRecommendation[] {
  const tasks: TaskRecommendation[] = [];

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

  if (untestedLogs.length > 0) {
    tasks.push({
      title: `Test ${Math.min(untestedLogs.length, 3)} untested implementations`,
      reason: `${untestedLogs.length} implementations awaiting verification`,
      priorityScore: 60,
      estimatedComplexity: 'light',
      suggestedSlot: 'afternoon',
    });
  }

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

  const trendEmoji = velocity.trend === 'accelerating' ? 'up'
    : velocity.trend === 'decelerating' ? 'slowing' : 'steady';
  parts.push(
    `Velocity is ${trendEmoji} (${velocity.percentChange > 0 ? '+' : ''}${velocity.percentChange}% vs last week). ` +
    `You're averaging ${velocity.currentPeriod.implementationsPerDay} implementations/day.`
  );

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

  const criticalContexts = contextAlerts.filter(a => a.urgency === 'critical');
  if (criticalContexts.length > 0) {
    parts.push(
      `Context${criticalContexts.length > 1 ? 's' : ''} losing momentum: ${criticalContexts.map(a => a.contextName).join(', ')}.`
    );
  }

  if (tasks.length > 0) {
    parts.push(`Start your day with: ${tasks[0].title}.`);
  }

  return parts.join(' ');
}

// ──────────────────────────────────────────────
// Goal Transition Suggestions
// ──────────────────────────────────────────────

function generateTransitionSuggestions(goalsAtRisk: GoalRiskAssessment[]): GoalTransitionSuggestion[] {
  const suggestions: GoalTransitionSuggestion[] = [];

  for (const goal of goalsAtRisk) {
    if (goal.progress >= 85 && goal.daysSinceActivity <= 7) {
      suggestions.push({
        goalId: goal.goalId,
        goalTitle: goal.goalTitle,
        goalStatus: goal.status,
        progress: goal.progress,
        daysSinceActivity: goal.daysSinceActivity,
        reason: `${goal.progress}% complete with recent activity — ready to confirm?`,
        actions: [{ type: 'confirm_complete', label: 'Mark Complete' }],
      });
      continue;
    }

    if (goal.daysSinceActivity >= 5) {
      const actions: GoalTransitionAction[] = [];
      if (goal.status === 'in_progress') {
        actions.push({ type: 'revert_open', label: 'Revert to Open' });
      }
      actions.push({ type: 'add_blocker', label: 'Add Blocker Signal' });

      suggestions.push({
        goalId: goal.goalId,
        goalTitle: goal.goalTitle,
        goalStatus: goal.status,
        progress: goal.progress,
        daysSinceActivity: goal.daysSinceActivity,
        reason: `No activity for ${goal.daysSinceActivity} day${goal.daysSinceActivity === 1 ? '' : 's'}`,
        actions,
      });
    }
  }

  return suggestions;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// emptyVelocityComparison is imported from signalProcessor
