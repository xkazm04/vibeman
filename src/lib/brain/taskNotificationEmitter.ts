/**
 * Task Notification Emitter
 * Emits task execution lifecycle events (start, complete, fail)
 * through the notification system for real-time awareness.
 *
 * Integrates with the existing notificationEngine by maintaining
 * an in-memory store of recent task events that the SSE polling
 * loop can pick up.
 */

import { logger } from '@/lib/logger';

export interface TaskNotificationEvent {
  id: string;
  taskId: string;
  taskName: string;
  projectId: string;
  status: 'started' | 'completed' | 'failed' | 'session-limit';
  filesChanged?: number;
  duration?: number; // milliseconds
  errorMessage?: string;
  timestamp: string;
}

// In-memory store of recent task events (consumed by notification checks)
const recentTaskEvents: Map<string, TaskNotificationEvent> = new Map();

// Throttle: max 1 progress update per 30s per task
const lastProgressTime: Map<string, number> = new Map();

/**
 * Emit a task started event
 */
export function emitTaskStarted(taskId: string, taskName: string, projectId: string): void {
  const event: TaskNotificationEvent = {
    id: `task-start-${taskId}-${Date.now()}`,
    taskId,
    taskName,
    projectId,
    status: 'started',
    timestamp: new Date().toISOString(),
  };

  recentTaskEvents.set(event.id, event);
  logger.debug('Task notification emitted: started', { taskId, taskName });
}

/**
 * Emit a task completed event
 */
export function emitTaskCompleted(
  taskId: string,
  taskName: string,
  projectId: string,
  filesChanged?: number,
  duration?: number
): void {
  const event: TaskNotificationEvent = {
    id: `task-complete-${taskId}-${Date.now()}`,
    taskId,
    taskName,
    projectId,
    status: 'completed',
    filesChanged,
    duration,
    timestamp: new Date().toISOString(),
  };

  recentTaskEvents.set(event.id, event);
  lastProgressTime.delete(taskId); // Clean up throttle state
  logger.debug('Task notification emitted: completed', { taskId, taskName, filesChanged, duration });
}

/**
 * Emit a task failed event
 */
export function emitTaskFailed(
  taskId: string,
  taskName: string,
  projectId: string,
  errorMessage?: string,
  duration?: number
): void {
  const event: TaskNotificationEvent = {
    id: `task-fail-${taskId}-${Date.now()}`,
    taskId,
    taskName,
    projectId,
    status: 'failed',
    errorMessage: errorMessage ? errorMessage.substring(0, 200) : undefined,
    duration,
    timestamp: new Date().toISOString(),
  };

  recentTaskEvents.set(event.id, event);
  lastProgressTime.delete(taskId); // Clean up throttle state
  logger.debug('Task notification emitted: failed', { taskId, taskName, errorMessage: errorMessage?.substring(0, 50) });
}

/**
 * Emit a task session-limit event
 */
export function emitTaskSessionLimit(
  taskId: string,
  taskName: string,
  projectId: string,
  duration?: number
): void {
  const event: TaskNotificationEvent = {
    id: `task-session-limit-${taskId}-${Date.now()}`,
    taskId,
    taskName,
    projectId,
    status: 'session-limit',
    errorMessage: 'Session or rate limit reached',
    duration,
    timestamp: new Date().toISOString(),
  };

  recentTaskEvents.set(event.id, event);
  lastProgressTime.delete(taskId);
  logger.debug('Task notification emitted: session-limit', { taskId, taskName });
}

/**
 * Get and consume recent task events for a project.
 * Events older than 5 minutes are pruned.
 * Each event is returned only once (consumed on read).
 */
export function consumeTaskEvents(projectId: string): TaskNotificationEvent[] {
  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;
  const events: TaskNotificationEvent[] = [];

  for (const [id, event] of recentTaskEvents.entries()) {
    const eventTime = new Date(event.timestamp).getTime();

    // Prune old events
    if (eventTime < fiveMinAgo) {
      recentTaskEvents.delete(id);
      continue;
    }

    // Collect events for this project
    if (event.projectId === projectId) {
      events.push(event);
      recentTaskEvents.delete(id); // Consume (don't re-emit)
    }
  }

  return events;
}

