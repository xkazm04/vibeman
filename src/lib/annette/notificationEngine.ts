/**
 * Annette Notification Engine
 * Generates proactive notifications from Brain events with throttling
 *
 * Event sources:
 * - Reflection completed → learning insights
 * - Implementation outcome recorded → success/failure alert
 * - Revert detected → warning
 * - Decision threshold approaching → status update
 * - Behavioral pattern shift → suggestion
 */

import { brainReflectionDb, directionOutcomeDb, behavioralSignalDb, directionDb } from '@/app/db';
import { logger } from '@/lib/logger';

export interface AnnetteNotification {
  id: string;
  type: 'insight' | 'outcome' | 'warning' | 'suggestion' | 'status';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  actionable: boolean;
  suggestedAction?: {
    tool: string;
    description: string;
  };
  timestamp: string;
}

// Throttle state per project
const lastNotificationTime: Map<string, Map<string, number>> = new Map();

const THROTTLE_MS = {
  low: 5 * 60 * 1000,     // 5 minutes
  medium: 60 * 1000,       // 1 minute
  high: 0,                  // Immediate
};

/**
 * Check for pending notifications for a project
 * Called on each SSE poll or when events fire
 */
export function checkForNotifications(projectId: string): AnnetteNotification[] {
  const notifications: AnnetteNotification[] = [];

  try {
    // Check reflection completion
    const reflectionNotif = checkReflectionCompleted(projectId);
    if (reflectionNotif) notifications.push(reflectionNotif);

    // Check recent outcomes (failures/reverts)
    const outcomeNotifs = checkRecentOutcomes(projectId);
    notifications.push(...outcomeNotifs);

    // Check decision threshold
    const thresholdNotif = checkDecisionThreshold(projectId);
    if (thresholdNotif) notifications.push(thresholdNotif);
  } catch (error) {
    logger.error('Notification check failed', { projectId, error });
  }

  // Apply throttling
  return notifications.filter(n => shouldSend(projectId, n));
}

/**
 * Check if a reflection recently completed with new insights
 */
function checkReflectionCompleted(projectId: string): AnnetteNotification | null {
  const latest = brainReflectionDb.getLatestCompleted(projectId);
  if (!latest || !latest.completed_at) return null;

  const completedAt = new Date(latest.completed_at).getTime();
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;

  // Only notify if completed in last 5 minutes
  if (completedAt < fiveMinAgo) return null;

  let insightCount = 0;
  try {
    if (latest.insights_generated) {
      insightCount = JSON.parse(latest.insights_generated).length;
    }
  } catch {}

  return {
    id: `reflection-${latest.id}`,
    type: 'insight',
    priority: 'medium',
    title: 'Reflection Complete',
    message: `Brain reflection finished analyzing ${latest.directions_analyzed || 0} directions. Generated ${insightCount} new insights about your development patterns.`,
    actionable: true,
    suggestedAction: {
      tool: 'get_insights',
      description: 'View the new learning insights',
    },
    timestamp: latest.completed_at,
  };
}

/**
 * Check for recent failures or reverts
 */
function checkRecentOutcomes(projectId: string): AnnetteNotification[] {
  const notifications: AnnetteNotification[] = [];
  const recent = directionOutcomeDb.getByProject(projectId, { limit: 5 });
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  for (const outcome of recent) {
    const outcomeTime = outcome.execution_completed_at
      ? new Date(outcome.execution_completed_at).getTime()
      : 0;

    if (outcomeTime < oneHourAgo) continue;

    // Revert detected - high priority
    if (outcome.was_reverted && outcome.revert_detected_at) {
      const revertTime = new Date(outcome.revert_detected_at).getTime();
      if (revertTime > oneHourAgo) {
        notifications.push({
          id: `revert-${outcome.id}`,
          type: 'warning',
          priority: 'high',
          title: 'Implementation Reverted',
          message: `A recent implementation was reverted. Consider breaking directions into smaller scopes or adding test scenarios first.`,
          actionable: true,
          suggestedAction: {
            tool: 'trigger_reflection',
            description: 'Trigger a reflection to analyze the pattern',
          },
          timestamp: outcome.revert_detected_at,
        });
      }
    }

    // Failed execution - medium priority
    if (outcome.execution_success === 0 && outcome.execution_completed_at) {
      notifications.push({
        id: `failure-${outcome.id}`,
        type: 'outcome',
        priority: 'medium',
        title: 'Implementation Failed',
        message: outcome.execution_error
          ? `Execution error: ${outcome.execution_error.substring(0, 100)}`
          : 'A direction implementation failed. Check the execution logs for details.',
        actionable: true,
        suggestedAction: {
          tool: 'get_implementation_logs',
          description: 'View recent implementation logs',
        },
        timestamp: outcome.execution_completed_at,
      });
    }
  }

  return notifications;
}

/**
 * Check if decision threshold is approaching
 */
function checkDecisionThreshold(projectId: string): AnnetteNotification | null {
  const lastReflection = brainReflectionDb.getLatestCompleted(projectId);
  const allDirections = directionDb.getDirectionsByProject(projectId);

  const lastReflectedAt = lastReflection?.completed_at;
  let decisionCount: number;

  if (lastReflectedAt) {
    decisionCount = allDirections.filter(d =>
      (d.status === 'accepted' || d.status === 'rejected') &&
      d.updated_at > lastReflectedAt
    ).length;
  } else {
    decisionCount = allDirections.filter(d =>
      d.status === 'accepted' || d.status === 'rejected'
    ).length;
  }

  // Notify when approaching threshold (18/20)
  if (decisionCount >= 18 && decisionCount < 20) {
    return {
      id: `threshold-${decisionCount}`,
      type: 'status',
      priority: 'low',
      title: 'Reflection Approaching',
      message: `You've made ${decisionCount}/20 decisions since the last reflection. A learning reflection will trigger soon.`,
      actionable: true,
      suggestedAction: {
        tool: 'trigger_reflection',
        description: 'Trigger reflection now to learn from recent decisions',
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Already past threshold
  if (decisionCount >= 20) {
    return {
      id: `threshold-ready-${decisionCount}`,
      type: 'suggestion',
      priority: 'medium',
      title: 'Reflection Ready',
      message: `${decisionCount} decisions accumulated. A reflection will generate new insights about your patterns.`,
      actionable: true,
      suggestedAction: {
        tool: 'trigger_reflection',
        description: 'Start a brain reflection now',
      },
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Throttle check - prevents notification spam
 */
function shouldSend(projectId: string, notification: AnnetteNotification): boolean {
  if (!lastNotificationTime.has(projectId)) {
    lastNotificationTime.set(projectId, new Map());
  }

  const projectThrottles = lastNotificationTime.get(projectId)!;
  const lastSent = projectThrottles.get(notification.id) || 0;
  const now = Date.now();
  const throttleMs = THROTTLE_MS[notification.priority];

  if (now - lastSent < throttleMs) {
    return false;
  }

  // Record send time
  projectThrottles.set(notification.id, now);
  return true;
}

/**
 * Clear throttle state for a project (e.g., when user acknowledges)
 */
export function clearThrottles(projectId: string): void {
  lastNotificationTime.delete(projectId);
}
