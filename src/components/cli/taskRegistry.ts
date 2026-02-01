/**
 * Client-side Task Registry API
 *
 * Helpers for interacting with the server-side task registry.
 * The registry is the authoritative source of truth for task execution status.
 */

interface TaskRecord {
  taskId: string;
  sessionId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  requirementName?: string;
  isStale?: boolean;
}

interface TaskStatusResponse {
  found: boolean;
  taskId: string;
  sessionId?: string;
  status?: 'running' | 'completed' | 'failed';
  startedAt?: number;
  completedAt?: number;
  isStale?: boolean;
}

interface SessionTasksResponse {
  sessionId: string;
  tasks: TaskRecord[];
}

interface StartTaskResponse {
  success: boolean;
  record?: TaskRecord;
  error?: string;
  runningTask?: TaskRecord;
}

interface CompleteTaskResponse {
  success: boolean;
  record?: TaskRecord;
  wasUntracked?: boolean;
}

const API_BASE = '/api/cli-task-registry';

/**
 * Register a task as started with the server
 */
export async function registerTaskStart(
  taskId: string,
  sessionId: string,
  requirementName?: string
): Promise<StartTaskResponse> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        taskId,
        sessionId,
        requirementName,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Failed to register task start:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Mark a task as completed or failed with the server
 */
export async function registerTaskComplete(
  taskId: string,
  sessionId: string,
  success: boolean
): Promise<CompleteTaskResponse> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'complete',
        taskId,
        sessionId,
        status: success ? 'completed' : 'failed',
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Failed to register task completion:', error);
    return { success: false };
  }
}

/**
 * Send heartbeat to keep task alive (for long-running tasks)
 */
export async function sendTaskHeartbeat(taskId: string): Promise<boolean> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'heartbeat',
        taskId,
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Failed to send heartbeat:', error);
    return false;
  }
}

/**
 * Get task status from server
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  try {
    const response = await fetch(`${API_BASE}?taskId=${encodeURIComponent(taskId)}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to get task status:', error);
    return { found: false, taskId };
  }
}

/**
 * Get all tasks for a session
 */
export async function getSessionTasks(sessionId: string): Promise<SessionTasksResponse> {
  try {
    const response = await fetch(`${API_BASE}?sessionId=${encodeURIComponent(sessionId)}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to get session tasks:', error);
    return { sessionId, tasks: [] };
  }
}

/**
 * Check if session has a running task on the server
 */
export async function hasRunningTask(sessionId: string): Promise<{
  hasRunning: boolean;
  runningTaskId?: string;
  isStale?: boolean;
}> {
  try {
    const { tasks } = await getSessionTasks(sessionId);
    const running = tasks.find(t => t.status === 'running');

    if (!running) {
      return { hasRunning: false };
    }

    // Check if it's stale (running too long)
    const TASK_TIMEOUT = 10 * 60 * 1000; // 10 minutes
    const isStale = (Date.now() - running.startedAt) > TASK_TIMEOUT;

    return {
      hasRunning: true,
      runningTaskId: running.taskId,
      isStale,
    };
  } catch (error) {
    console.error('Failed to check running task:', error);
    return { hasRunning: false };
  }
}

/**
 * Clear all tasks for a session
 */
export async function clearSessionTasks(sessionId: string): Promise<number> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clear',
        sessionId,
      }),
    });

    const data = await response.json();
    return data.cleared || 0;
  } catch (error) {
    console.error('Failed to clear session tasks:', error);
    return 0;
  }
}

