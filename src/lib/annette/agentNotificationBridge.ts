/**
 * Agent Notification Bridge
 * Emits autonomous agent events into the task notification system
 * so they surface via the existing SSE stream in real-time.
 */

import { logger } from '@/lib/logger';

export type AgentEventType =
  | 'decomposing'
  | 'running'
  | 'paused'
  | 'resumed'
  | 'cancelled'
  | 'completed'
  | 'failed'
  | 'step_started'
  | 'step_completed'
  | 'step_failed';

export interface AgentNotificationEvent {
  id: string;
  goalId: string;
  projectId: string;
  eventType: AgentEventType;
  message: string;
  timestamp: string;
}

// In-memory ring buffer of recent agent events (consumed by SSE polling)
const recentAgentEvents: Map<string, AgentNotificationEvent> = new Map();

/**
 * Emit an agent event that will be picked up by the notification system
 */
export function emitAgentEvent(
  projectId: string,
  goalId: string,
  eventType: AgentEventType,
  message: string
): void {
  const event: AgentNotificationEvent = {
    id: `agent-${eventType}-${goalId}-${Date.now()}`,
    goalId,
    projectId,
    eventType,
    message,
    timestamp: new Date().toISOString(),
  };

  recentAgentEvents.set(event.id, event);
  logger.debug('[Agent] Event emitted', { eventType, goalId, message: message.substring(0, 80) });
}

/**
 * Consume recent agent events for a project.
 * Each event is returned only once. Old events (>5 min) are pruned.
 */
export function consumeAgentEvents(projectId: string): AgentNotificationEvent[] {
  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;
  const events: AgentNotificationEvent[] = [];

  for (const [id, event] of recentAgentEvents.entries()) {
    const eventTime = new Date(event.timestamp).getTime();

    if (eventTime < fiveMinAgo) {
      recentAgentEvents.delete(id);
      continue;
    }

    if (event.projectId === projectId) {
      events.push(event);
      recentAgentEvents.delete(id);
    }
  }

  return events;
}
