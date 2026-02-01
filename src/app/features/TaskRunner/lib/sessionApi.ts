/**
 * Session API Layer
 * Handles Claude Code session management with --resume flag support
 */

import type { BatchId } from '../store/taskRunnerStore';

// Session task type for execution manager
export interface SessionTask {
  id: string;
  requirementName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  claudeSessionId?: string;
  errorMessage?: string;
}
import { sendSessionHeartbeat } from '../hooks/useSessionCleanup';

// ============================================================================
// Types
// ============================================================================

export interface CreateSessionParams {
  projectId: string;
  name: string;
  taskId: string;
  requirementName: string;
}

export interface SessionResponse {
  id: string;
  projectId: string;
  name: string;
  claudeSessionId: string | null;
  status: string;
  contextTokens: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionTaskResponse {
  id: string;
  sessionId: string;
  taskId: string;
  orderIndex: number;
  status: string;
  createdAt: string;
}

export interface ExecuteSessionTaskParams {
  projectPath: string;
  requirementName: string;
  projectId: string;
  sessionId: string;
  claudeSessionId?: string | null;
}

// ============================================================================
// Session CRUD Operations
// ============================================================================

/**
 * Create a new session in the database
 */
export async function createSession(params: CreateSessionParams): Promise<{
  session: SessionResponse;
  tasks: SessionTaskResponse[];
}> {
  const response = await fetch('/api/claude-code/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      ...params,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create session');
  }

  return response.json();
}

/**
 * Add a task to an existing session
 */
export async function addTaskToSession(
  sessionId: string,
  taskId: string,
  requirementName: string
): Promise<SessionTaskResponse> {
  const response = await fetch('/api/claude-code/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'add-task',
      sessionId,
      taskId,
      requirementName,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add task to session');
  }

  const data = await response.json();
  return data.task;
}

/**
 * Update session's Claude session ID (captured after first execution)
 */
export async function updateSessionClaudeId(
  sessionId: string,
  claudeSessionId: string
): Promise<void> {
  const response = await fetch('/api/claude-code/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update-claude-session-id',
      sessionId,
      claudeSessionId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update Claude session ID');
  }
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  sessionId: string,
  status: string
): Promise<void> {
  const response = await fetch('/api/claude-code/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update-session-status',
      sessionId,
      status,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update session status');
  }
}

/**
 * Update task status in a session
 */
export async function updateSessionTaskStatus(
  sessionId: string,
  taskId: string,
  status: string,
  extras?: { errorMessage?: string }
): Promise<void> {
  const response = await fetch('/api/claude-code/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update-task-status',
      sessionId,
      taskId,
      status,
      extras,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update task status');
  }
}

/**
 * Get next pending task from session
 */
export async function getNextPendingTask(sessionId: string): Promise<SessionTaskResponse | null> {
  const response = await fetch('/api/claude-code/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'get-next-pending',
      sessionId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get next pending task');
  }

  const data = await response.json();
  return data.task;
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`/api/claude-code/sessions?sessionId=${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete session');
  }
}

// ============================================================================
// Session Execution
// ============================================================================

/**
 * Execute a task within a session context
 * Uses --resume flag if claudeSessionId is provided
 */
export async function executeSessionTask(params: ExecuteSessionTaskParams): Promise<{
  success: boolean;
  taskId: string;
}> {
  const response = await fetch('/api/claude-code/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath: params.projectPath,
      requirementName: params.requirementName,
      projectId: params.projectId,
      async: true,
      sessionConfig: {
        sessionId: params.sessionId,
        claudeSessionId: params.claudeSessionId || undefined,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to execute session task');
  }

  return response.json();
}

/**
 * Get task execution status
 */
export async function getTaskExecutionStatus(taskId: string): Promise<{
  status: string;
  capturedClaudeSessionId?: string;
  error?: string;
  output?: string;
}> {
  const response = await fetch(`/api/claude-code/tasks/${encodeURIComponent(taskId)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get task status');
  }

  const data = await response.json();
  return data.task || data;
}

// ============================================================================
// Session Execution Manager
// ============================================================================

/**
 * Manages the execution of tasks within a session
 * Handles --resume flag propagation between tasks
 */
export class SessionExecutionManager {
  private batchId: BatchId;
  private sessionId: string;
  private claudeSessionId: string | null = null;
  private projectPath: string;
  private projectId: string;
  private onTaskStatusChange: (
    taskId: string,
    status: 'pending' | 'running' | 'completed' | 'failed',
    extras?: { claudeSessionId?: string; errorMessage?: string }
  ) => void;
  private onSessionStatusChange: (status: 'pending' | 'running' | 'paused' | 'completed' | 'failed') => void;
  private onClaudeSessionIdCaptured: (claudeSessionId: string) => void;
  private isPaused: boolean = false;
  private currentPollingTaskId: string | null = null;

  constructor(config: {
    batchId: BatchId;
    sessionId: string;
    claudeSessionId: string | null;
    projectPath: string;
    projectId: string;
    onTaskStatusChange: (
      taskId: string,
      status: 'pending' | 'running' | 'completed' | 'failed',
      extras?: { claudeSessionId?: string; errorMessage?: string }
    ) => void;
    onSessionStatusChange: (status: 'pending' | 'running' | 'paused' | 'completed' | 'failed') => void;
    onClaudeSessionIdCaptured: (claudeSessionId: string) => void;
  }) {
    this.batchId = config.batchId;
    this.sessionId = config.sessionId;
    this.claudeSessionId = config.claudeSessionId;
    this.projectPath = config.projectPath;
    this.projectId = config.projectId;
    this.onTaskStatusChange = config.onTaskStatusChange;
    this.onSessionStatusChange = config.onSessionStatusChange;
    this.onClaudeSessionIdCaptured = config.onClaudeSessionIdCaptured;
  }

  /**
   * Start executing tasks in the session
   */
  async start(tasks: SessionTask[]): Promise<void> {
    this.isPaused = false;
    this.onSessionStatusChange('running');

    // Find first pending task
    const pendingTask = tasks.find(t => t.status === 'pending');
    if (!pendingTask) {
      // All tasks completed or failed
      const allCompleted = tasks.every(t => t.status === 'completed');
      this.onSessionStatusChange(allCompleted ? 'completed' : 'failed');
      return;
    }

    await this.executeTask(pendingTask, tasks);
  }

  /**
   * Pause execution
   */
  pause(): void {
    this.isPaused = true;
    this.onSessionStatusChange('paused');
  }

  /**
   * Resume execution
   */
  async resume(tasks: SessionTask[]): Promise<void> {
    this.isPaused = false;
    this.onSessionStatusChange('running');

    // Find first pending task
    const pendingTask = tasks.find(t => t.status === 'pending');
    if (pendingTask) {
      await this.executeTask(pendingTask, tasks);
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: SessionTask, allTasks: SessionTask[]): Promise<void> {
    if (this.isPaused) return;

    // Extract requirement name from task ID (format: projectId:requirementName)
    const parts = task.id.split(':');
    const requirementName = parts.length > 1 ? parts.slice(1).join(':') : task.requirementName;

    console.log(`🚀 Executing session task: ${requirementName} (session: ${this.sessionId})`);

    // Mark task as running
    this.onTaskStatusChange(task.id, 'running');

    try {
      // Execute the task
      const result = await executeSessionTask({
        projectPath: this.projectPath,
        requirementName,
        projectId: this.projectId,
        sessionId: this.sessionId,
        claudeSessionId: this.claudeSessionId,
      });

      // Start polling for completion
      this.currentPollingTaskId = result.taskId;
      await this.pollForCompletion(result.taskId, task, allTasks);
    } catch (error) {
      console.error(`❌ Failed to execute task: ${task.id}`, error);
      this.onTaskStatusChange(task.id, 'failed', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      // Continue to next task
      await this.continueToNextTask(allTasks, task.id);
    }
  }

  /**
   * Poll for task completion
   */
  private async pollForCompletion(
    executionTaskId: string,
    sessionTask: SessionTask,
    allTasks: SessionTask[]
  ): Promise<void> {
    const maxAttempts = 360; // 30 minutes at 5s intervals
    let attempts = 0;

    const poll = async (): Promise<void> => {
      if (this.isPaused) return;

      attempts++;
      if (attempts > maxAttempts) {
        console.error(`⏰ Polling timeout for task: ${sessionTask.id}`);
        this.onTaskStatusChange(sessionTask.id, 'failed', {
          errorMessage: 'Execution timeout',
        });
        await this.continueToNextTask(allTasks, sessionTask.id);
        return;
      }

      try {
        const status = await getTaskExecutionStatus(executionTaskId);

        // Send heartbeat to keep session alive
        if (this.sessionId) {
          sendSessionHeartbeat(this.sessionId).catch(() => {
            // Heartbeat failed, but don't interrupt polling
          });
        }

        if (status.status === 'completed') {
          console.log(`✅ Task completed: ${sessionTask.id}`);

          // Capture Claude session ID if available (from first task)
          if (status.capturedClaudeSessionId && !this.claudeSessionId) {
            this.claudeSessionId = status.capturedClaudeSessionId;
            this.onClaudeSessionIdCaptured(status.capturedClaudeSessionId);
            console.log(`📎 Captured Claude session ID: ${status.capturedClaudeSessionId}`);
          }

          this.onTaskStatusChange(sessionTask.id, 'completed', {
            claudeSessionId: status.capturedClaudeSessionId,
          });

          // Continue to next task
          await this.continueToNextTask(allTasks, sessionTask.id);
          return;
        }

        if (status.status === 'failed' || status.status === 'session-limit') {
          console.error(`❌ Task failed: ${sessionTask.id}`, status.error);
          this.onTaskStatusChange(sessionTask.id, 'failed', {
            errorMessage: status.error || 'Task failed',
          });

          // Continue to next task
          await this.continueToNextTask(allTasks, sessionTask.id);
          return;
        }

        // Still running, poll again
        setTimeout(() => poll(), 5000);
      } catch (error) {
        console.error('Error polling task status:', error);
        // Continue polling despite error
        setTimeout(() => poll(), 5000);
      }
    };

    await poll();
  }

  /**
   * Continue to the next pending task
   */
  private async continueToNextTask(allTasks: SessionTask[], completedTaskId: string): Promise<void> {
    if (this.isPaused) return;

    // Find next pending task
    const pendingTask = allTasks.find(t => t.id !== completedTaskId && t.status === 'pending');

    if (pendingTask) {
      // Small delay before starting next task
      setTimeout(() => this.executeTask(pendingTask, allTasks), 1000);
    } else {
      // No more pending tasks - check if all completed or some failed
      const completedTasks = allTasks.filter(t => t.status === 'completed' || t.id === completedTaskId);
      const allCompleted = completedTasks.length === allTasks.length;
      this.onSessionStatusChange(allCompleted ? 'completed' : 'failed');
    }
  }
}
