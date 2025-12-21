/**
 * Bridge Client
 * Client-side utilities for emitting events to the bridge
 * Used by TaskRunner and other client-side code
 */

import { BridgeEventType } from './types';

/**
 * Emit an event to all connected bridge clients
 * Call this from client-side code when something happens
 */
export async function emitBridgeEvent<T>(
  type: BridgeEventType,
  payload: T,
  projectId: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/bridge/emit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, payload, projectId }),
    });

    if (!response.ok) {
      console.warn(`[BridgeClient] Failed to emit ${type} event:`, response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    // Silently fail - bridge events are optional
    console.warn(`[BridgeClient] Error emitting ${type} event:`, error);
    return false;
  }
}

/**
 * Emit task started event
 */
export function emitTaskStarted(
  taskId: string,
  batchId: string,
  title: string,
  projectId: string
): void {
  emitBridgeEvent('task_started', {
    taskId,
    batchId,
    title,
    status: 'running',
  }, projectId);
}

/**
 * Emit task completed event
 */
export function emitTaskCompleted(
  taskId: string,
  batchId: string,
  title: string,
  projectId: string
): void {
  emitBridgeEvent('task_completed', {
    taskId,
    batchId,
    title,
    status: 'completed',
  }, projectId);
}

/**
 * Emit task failed event
 */
export function emitTaskFailed(
  taskId: string,
  batchId: string,
  title: string,
  projectId: string,
  error?: string
): void {
  emitBridgeEvent('task_failed', {
    taskId,
    batchId,
    title,
    status: 'failed',
    error,
  }, projectId);
}

/**
 * Emit batch progress event
 */
export function emitBatchProgress(
  batchId: string,
  completed: number,
  total: number,
  projectId: string,
  currentTaskId?: string,
  currentTaskTitle?: string
): void {
  emitBridgeEvent('batch_progress', {
    batchId,
    completed,
    total,
    currentTaskId,
    currentTaskTitle,
  }, projectId);
}
