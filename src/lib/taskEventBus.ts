/**
 * Task Lifecycle Event Bus
 *
 * Lightweight emit/subscribe bus for task lifecycle events.
 * Stores emit events after updating their own state; other stores
 * or components can subscribe to react without direct cross-store writes.
 */

export type TaskLifecycleEvent =
  | { type: 'task-queued'; taskId: string; sessionId?: string }
  | { type: 'task-started'; taskId: string; sessionId?: string }
  | { type: 'task-completed'; taskId: string; sessionId?: string }
  | { type: 'task-failed'; taskId: string; error?: string; sessionId?: string };

export type TaskEventListener = (event: TaskLifecycleEvent) => void;

class TaskEventBus {
  private listeners: Set<TaskEventListener> = new Set();

  /** Subscribe to all lifecycle events. Returns an unsubscribe function. */
  subscribe(listener: TaskEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Emit a lifecycle event to all subscribers. */
  emit(event: TaskLifecycleEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[taskEventBus] listener threw:', err);
      }
    }
  }
}

export const taskEventBus = new TaskEventBus();
