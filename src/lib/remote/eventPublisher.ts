/**
 * Remote Event Publisher
 * Fire-and-forget event publishing to Supabase
 * Replaces bridge eventEmitter for cross-app communication
 */

import { SupabaseService } from './supabaseService';
import type {
  RemoteEventType,
  IdeaEventPayload,
  GoalEventPayload,
  TaskEventPayload,
  BatchProgressPayload,
  ScanEventPayload,
} from './types';

class RemoteEventPublisher extends SupabaseService {
  protected readonly serviceName = 'RemoteEventPublisher';

  /**
   * Publish an event (fire-and-forget)
   * Never throws - logs errors silently
   */
  publish<T>(
    eventType: RemoteEventType,
    payload: T,
    projectId: string,
    source: string = 'vibeman'
  ): void {
    if (!this.isReady()) {
      // Silently skip if not configured - this is expected behavior
      return;
    }

    // Fire and forget - don't await
    Promise.resolve(
      this.supabase!.from('vibeman_events')
        .insert({
          project_id: projectId,
          event_type: eventType,
          payload,
          source,
        })
    )
      .then(({ error }) => {
        if (error) {
          console.warn('[RemoteEventPublisher] Failed to publish event:', error.message);
        }
      })
      .catch((err: Error) => {
        console.warn('[RemoteEventPublisher] Network error:', err.message);
      });
  }

  /**
   * Publish multiple events in a batch
   */
  publishBatch<T>(
    events: Array<{
      eventType: RemoteEventType;
      payload: T;
      projectId: string;
      source?: string;
    }>
  ): void {
    if (!this.isReady() || events.length === 0) return;

    const records = events.map((e) => ({
      project_id: e.projectId,
      event_type: e.eventType,
      payload: e.payload,
      source: e.source || 'vibeman',
    }));

    Promise.resolve(
      this.supabase!.from('vibeman_events')
        .insert(records)
    )
      .then(({ error }) => {
        if (error) {
          console.warn('[RemoteEventPublisher] Failed to publish batch:', error.message);
        }
      })
      .catch((err: Error) => {
        console.warn('[RemoteEventPublisher] Batch network error:', err.message);
      });
  }

  // ============================================================================
  // Convenience methods for common events
  // ============================================================================

  ideaGenerated(projectId: string, data: IdeaEventPayload): void {
    this.publish('idea_generated', data, projectId);
  }

  ideaUpdated(projectId: string, data: IdeaEventPayload & { status: string }): void {
    this.publish('idea_updated', data, projectId);
  }

  ideaAccepted(projectId: string, data: IdeaEventPayload): void {
    this.publish('idea_accepted', data, projectId);
  }

  ideaRejected(projectId: string, data: IdeaEventPayload): void {
    this.publish('idea_rejected', data, projectId);
  }

  goalCreated(projectId: string, data: GoalEventPayload): void {
    this.publish('goal_created', data, projectId);
  }

  goalUpdated(projectId: string, data: GoalEventPayload): void {
    this.publish('goal_updated', data, projectId);
  }

  goalCompleted(projectId: string, data: GoalEventPayload): void {
    this.publish('goal_completed', data, projectId);
  }

  goalDeleted(projectId: string, data: GoalEventPayload): void {
    this.publish('goal_deleted', data, projectId);
  }

  taskStarted(projectId: string, data: TaskEventPayload): void {
    this.publish('task_started', data, projectId);
  }

  taskCompleted(projectId: string, data: TaskEventPayload): void {
    this.publish('task_completed', data, projectId);
  }

  taskFailed(projectId: string, data: TaskEventPayload): void {
    this.publish('task_failed', data, projectId);
  }

  batchProgress(projectId: string, data: BatchProgressPayload): void {
    this.publish('batch_progress', data, projectId);
  }

  scanCompleted(projectId: string, data: ScanEventPayload): void {
    this.publish('scan_completed', data, projectId);
  }

  implementationCompleted(
    projectId: string,
    data: { taskId: string; requirementName: string }
  ): void {
    this.publish('implementation_completed', data, projectId);
  }
}

// Singleton instance
let instance: RemoteEventPublisher | null = null;

export function getRemoteEventPublisher(): RemoteEventPublisher {
  if (!instance) {
    instance = new RemoteEventPublisher();
  }
  return instance;
}

// Default export for convenience
export const remoteEvents = getRemoteEventPublisher();
