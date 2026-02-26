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

import { brainReflectionDb, brainInsightDb, directionOutcomeDb, behavioralSignalDb, directionDb } from '@/app/db';
import { consumeTaskEvents, TaskNotificationEvent } from '@/lib/brain/taskNotificationEmitter';
import { consumeAgentEvents, AgentNotificationEvent } from './agentNotificationBridge';
import { personaMessageRepository } from '@/app/db/repositories/persona.repository';
import { logger } from '@/lib/logger';

export interface AnnetteNotification {
  id: string;
  type: 'insight' | 'outcome' | 'warning' | 'suggestion' | 'status' | 'task_execution' | 'autonomous_agent';
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

    // Check task execution events
    const taskNotifs = checkTaskExecutionEvents(projectId);
    notifications.push(...taskNotifs);

    // Check autonomous agent events
    const agentNotifs = checkAgentEvents(projectId);
    notifications.push(...agentNotifs);

    // Check unread persona messages (bridges Annette Voice Bridge → Annette UI badge)
    const personaNotifs = checkPersonaMessages();
    notifications.push(...personaNotifs);
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

  const insightCount = brainInsightDb.countByReflection(latest.id);

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
 * Convert task execution events into notifications
 */
function checkTaskExecutionEvents(projectId: string): AnnetteNotification[] {
  const events = consumeTaskEvents(projectId);
  return events.map(event => taskEventToNotification(event));
}

/**
 * Convert a single task event to an AnnetteNotification
 */
function taskEventToNotification(event: TaskNotificationEvent): AnnetteNotification {
  switch (event.status) {
    case 'started':
      return {
        id: event.id,
        type: 'task_execution',
        priority: 'low',
        title: 'Task Started',
        message: `Executing: ${event.taskName}`,
        actionable: false,
        timestamp: event.timestamp,
      };

    case 'completed': {
      const durationStr = event.duration
        ? formatDuration(event.duration)
        : 'unknown duration';
      const filesStr = event.filesChanged !== undefined
        ? `${event.filesChanged} files changed`
        : 'changes applied';
      return {
        id: event.id,
        type: 'task_execution',
        priority: 'medium',
        title: 'Task Completed',
        message: `${event.taskName} finished (${durationStr}, ${filesStr})`,
        actionable: true,
        suggestedAction: {
          tool: 'review_changes',
          description: 'Review the implementation changes',
        },
        timestamp: event.timestamp,
      };
    }

    case 'failed':
      return {
        id: event.id,
        type: 'task_execution',
        priority: 'high',
        title: 'Task Failed',
        message: event.errorMessage
          ? `${event.taskName} failed: ${event.errorMessage}`
          : `${event.taskName} failed. Check execution logs for details.`,
        actionable: true,
        suggestedAction: {
          tool: 'retry_task',
          description: 'Retry the failed task',
        },
        timestamp: event.timestamp,
      };

    case 'session-limit':
      return {
        id: event.id,
        type: 'task_execution',
        priority: 'high',
        title: 'Session Limit Reached',
        message: `${event.taskName} stopped due to session/rate limits. Try again later.`,
        actionable: true,
        suggestedAction: {
          tool: 'retry_task',
          description: 'Retry when limits reset',
        },
        timestamp: event.timestamp,
      };
  }
}

/**
 * Format milliseconds into a human-readable duration string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Check for unread persona messages and convert to Annette notifications.
 * This bridges the persona messaging system → Annette UI badge.
 * Only surfaces recent unread messages (last 5 minutes) to avoid flooding.
 */
function checkPersonaMessages(): AnnetteNotification[] {
  const notifications: AnnetteNotification[] = [];

  try {
    const unread = personaMessageRepository.getGlobalWithPersonaInfo(10, 0, { is_read: 0 });
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;

    for (const msg of unread) {
      const createdAt = new Date(msg.created_at).getTime();
      if (createdAt < fiveMinAgo) continue;

      const personaName = msg.persona_name || 'Persona';
      const priority: 'low' | 'medium' | 'high' =
        msg.priority === 'high' ? 'high' :
        msg.priority === 'normal' ? 'medium' : 'low';

      notifications.push({
        id: `persona-msg-${msg.id}`,
        type: 'insight',
        priority,
        title: msg.title || `Message from ${personaName}`,
        message: msg.content.length > 200
          ? msg.content.substring(0, 200) + '...'
          : msg.content,
        actionable: false,
        timestamp: msg.created_at,
      });
    }
  } catch {
    // Persona message check is non-critical
  }

  return notifications;
}

/**
 * Convert autonomous agent events into notifications
 */
function checkAgentEvents(projectId: string): AnnetteNotification[] {
  const events = consumeAgentEvents(projectId);
  return events.map(event => agentEventToNotification(event));
}

function agentEventToNotification(event: AgentNotificationEvent): AnnetteNotification {
  const priorityMap: Record<string, 'low' | 'medium' | 'high'> = {
    decomposing: 'low',
    running: 'low',
    paused: 'medium',
    resumed: 'low',
    cancelled: 'medium',
    completed: 'high',
    failed: 'high',
    step_started: 'low',
    step_completed: 'low',
    step_failed: 'medium',
  };

  return {
    id: event.id,
    type: 'autonomous_agent',
    priority: priorityMap[event.eventType] || 'low',
    title: `Agent: ${event.eventType.replace(/_/g, ' ')}`,
    message: event.message,
    actionable: ['completed', 'failed', 'paused'].includes(event.eventType),
    suggestedAction: event.eventType === 'completed'
      ? { tool: 'get_insights', description: 'Review agent results' }
      : event.eventType === 'failed'
      ? { tool: 'retry_task', description: 'Review and retry' }
      : undefined,
    timestamp: event.timestamp,
  };
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

/**
 * Get pending notifications formatted as conversation context.
 * Injected into the next Annette conversation turn for proactive awareness.
 */
export function getNotificationContext(projectId: string): string | null {
  const notifications = checkForNotifications(projectId);
  if (notifications.length === 0) return null;

  const lines = notifications.map(n => {
    const actionHint = n.suggestedAction
      ? ` (suggested: ${n.suggestedAction.description})`
      : '';
    return `- [${n.priority.toUpperCase()}] ${n.title}: ${n.message}${actionHint}`;
  });

  return `## Recent System Events\n${lines.join('\n')}`;
}

/**
 * Get the most recent notifications as structured data for UI display.
 * Returns up to 5 most recent notifications.
 */
export function getRecentNotifications(projectId: string, limit: number = 5): AnnetteNotification[] {
  return checkForNotifications(projectId).slice(0, limit);
}
