/**
 * Task Change Emitter
 *
 * A server-side EventEmitter singleton that fires whenever a task's status
 * changes in the execution queue. SSE endpoints subscribe to this emitter
 * to push real-time updates to clients, replacing 10s polling.
 *
 * Uses globalThis to survive Next.js HMR module reloads in dev mode.
 */

import { EventEmitter } from 'events';

export interface TaskChangeEvent {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'session-limit';
  progressCount: number;
  timestamp: string;
}

const GLOBAL_KEY = '__vibeman_taskChangeEmitter';

function getEmitter(): EventEmitter {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(50); // Support many concurrent SSE connections
    g[GLOBAL_KEY] = emitter;
  }
  return g[GLOBAL_KEY] as EventEmitter;
}

/**
 * Emit a task change event. Called by ClaudeExecutionQueue when task state changes.
 */
export function emitTaskChange(event: TaskChangeEvent): void {
  getEmitter().emit(`task:${event.taskId}`, event);
  getEmitter().emit('task:*', event); // Wildcard for batch-level listeners
}

/**
 * Subscribe to changes for a specific task.
 * Returns an unsubscribe function.
 */
export function onTaskChange(taskId: string, handler: (event: TaskChangeEvent) => void): () => void {
  const emitter = getEmitter();
  emitter.on(`task:${taskId}`, handler);
  return () => emitter.off(`task:${taskId}`, handler);
}

/**
 * Subscribe to all task changes (wildcard).
 * Returns an unsubscribe function.
 */
export function onAnyTaskChange(handler: (event: TaskChangeEvent) => void): () => void {
  const emitter = getEmitter();
  emitter.on('task:*', handler);
  return () => emitter.off('task:*', handler);
}
