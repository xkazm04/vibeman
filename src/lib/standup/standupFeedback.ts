/**
 * Standup Feedback Loop
 *
 * Feeds standup intelligence (risk assessments, context decay alerts)
 * back into the goal lifecycle as signals. This closes the loop:
 * goals inform standups, and standups inform goals.
 *
 * Deduplication: Only creates one standup_risk_alert per goal per day
 * to avoid flooding the signal history on repeated standup generation.
 */

import { goalSignalRepository, goalSubGoalRepository } from '@/app/db/repositories/goal-lifecycle.repository';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { logger } from '@/lib/logger';
import type {
  PredictiveStandupData,
  GoalRiskAssessment,
  ContextDecayAlert,
} from '@/app/db/models/standup.types';

export interface StandupFeedbackResult {
  signalsCreated: number;
  subGoalsSuggested: number;
  goalsFlagged: string[];
}

/**
 * Feed standup predictions back into the goal lifecycle system.
 *
 * For each at-risk goal (medium/high), creates a `standup_risk_alert` signal
 * capturing the risk assessment. For high-risk goals without sub-goals,
 * generates proactive sub-goal suggestions based on the risk analysis.
 *
 * For critical context decay alerts linked to active goals, creates signals
 * on those goals to surface the decay in their signal history.
 */
export function feedStandupInsightsToGoals(
  projectId: string,
  predictions: PredictiveStandupData
): StandupFeedbackResult {
  const result: StandupFeedbackResult = {
    signalsCreated: 0,
    subGoalsSuggested: 0,
    goalsFlagged: [],
  };

  try {
    const today = new Date().toISOString().split('T')[0];

    // Process at-risk goals (medium and high risk)
    const riskyGoals = predictions.goalsAtRisk.filter(
      g => g.riskLevel === 'high' || g.riskLevel === 'medium'
    );

    for (const risk of riskyGoals) {
      if (hasRecentRiskAlert(risk.goalId, today)) continue;

      goalSignalRepository.create({
        goal_id: risk.goalId,
        project_id: projectId,
        signal_type: 'standup_risk_alert',
        source_id: `standup-risk-${today}`,
        source_title: `Standup Risk: ${risk.riskLevel}`,
        description: risk.riskReason,
        progress_delta: 0,
        metadata: {
          riskLevel: risk.riskLevel,
          riskReason: risk.riskReason,
          suggestedAction: risk.suggestedAction,
          velocityTrend: risk.velocityTrend,
          daysSinceActivity: risk.daysSinceActivity,
          progress: risk.progress,
          source: 'predictive_standup',
          date: today,
        },
      });

      result.signalsCreated++;
      result.goalsFlagged.push(risk.goalId);

      // For high-risk goals, suggest sub-goals if none exist
      if (risk.riskLevel === 'high') {
        const suggested = suggestSubGoalsForRisk(risk, projectId);
        result.subGoalsSuggested += suggested;
      }
    }

    // Process critical context decay alerts linked to active goals
    const criticalDecay = predictions.contextDecayAlerts.filter(
      a => a.urgency === 'critical' && a.linkedToActiveGoals
    );

    for (const decay of criticalDecay) {
      const linkedGoals = goalRepository.getActiveGoalsByContextId(decay.contextId);
      for (const goal of linkedGoals) {
        if (result.goalsFlagged.includes(goal.id)) continue;
        if (hasRecentRiskAlert(goal.id, today)) continue;

        goalSignalRepository.create({
          goal_id: goal.id,
          project_id: projectId,
          signal_type: 'standup_risk_alert',
          source_id: `standup-decay-${today}`,
          source_title: `Context Decay: ${decay.contextName}`,
          description: `Context "${decay.contextName}" is ${decay.decayStatus} (${decay.decayPercent}% decay). ${decay.suggestion}`,
          progress_delta: 0,
          metadata: {
            contextId: decay.contextId,
            contextName: decay.contextName,
            decayPercent: decay.decayPercent,
            decayStatus: decay.decayStatus,
            urgency: decay.urgency,
            source: 'predictive_standup',
            date: today,
          },
        });

        result.signalsCreated++;
        result.goalsFlagged.push(goal.id);
      }
    }

    if (result.signalsCreated > 0) {
      logger.info('[StandupFeedback] Fed insights back to goals', {
        projectId,
        signalsCreated: result.signalsCreated,
        subGoalsSuggested: result.subGoalsSuggested,
        goalsFlagged: result.goalsFlagged.length,
      });
    }
  } catch (error) {
    logger.error('[StandupFeedback] Error feeding insights to goals:', { error, projectId });
  }

  return result;
}

/**
 * Check if a goal already has a standup risk alert for today.
 * Prevents duplicate signals when standup is regenerated.
 */
function hasRecentRiskAlert(goalId: string, today: string): boolean {
  const recentSignals = goalSignalRepository.getByGoal(goalId, 10);
  return recentSignals.some(
    s => s.signal_type === 'standup_risk_alert'
      && s.source_id?.startsWith('standup-')
      && s.source_id?.endsWith(today)
  );
}

/**
 * Suggest sub-goals for a high-risk goal that has no existing sub-goals.
 * Creates actionable recovery sub-goals based on the risk assessment.
 */
function suggestSubGoalsForRisk(
  risk: GoalRiskAssessment,
  projectId: string
): number {
  const existingSubGoals = goalSubGoalRepository.getByParent(risk.goalId);
  if (existingSubGoals.length > 0) return 0;

  const suggestions = buildRiskRecoverySubGoals(risk);
  if (suggestions.length === 0) return 0;

  goalSubGoalRepository.createBatch(
    suggestions.map((title, i) => ({
      parent_goal_id: risk.goalId,
      project_id: projectId,
      title,
      description: `Auto-suggested by standup risk analysis (${risk.riskReason})`,
      order_index: i,
    }))
  );

  return suggestions.length;
}

/**
 * Build recovery sub-goal titles based on the type of risk detected.
 */
function buildRiskRecoverySubGoals(risk: GoalRiskAssessment): string[] {
  if (risk.velocityTrend === 'stalled' && risk.daysSinceActivity >= 7) {
    return [
      `Review and reassess scope for "${risk.goalTitle}"`,
      `Identify and remove blockers`,
      `Complete one small deliverable to restart momentum`,
    ];
  }

  if (risk.velocityTrend === 'stalled') {
    return [
      `Break "${risk.goalTitle}" into smaller tasks`,
      `Complete next incremental step`,
    ];
  }

  if (risk.daysSinceActivity >= 7) {
    return [
      `Resume work on "${risk.goalTitle}"`,
      `Update goal scope if priorities changed`,
    ];
  }

  if (risk.progress < 30) {
    return [
      `Define concrete next steps for "${risk.goalTitle}"`,
      `Complete initial implementation milestone`,
    ];
  }

  return [];
}
