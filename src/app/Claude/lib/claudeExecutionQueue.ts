/**
 * Background execution queue for Claude Code requirements
 * Allows non-blocking execution with progress tracking
 */

import { executeRequirement } from './claudeCodeManager';

export interface ExecutionTask {
  id: string;
  projectPath: string;
  requirementName: string;
  projectId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'session-limit';
  progress: string[];
  output?: string;
  error?: string;
  logFilePath?: string;
  startTime?: Date;
  endTime?: Date;
  sessionLimitReached?: boolean;
}

class ClaudeExecutionQueue {
  private tasks: Map<string, ExecutionTask> = new Map();
  private isProcessing = false;

  /**
   * Add a new task to the queue
   */
  addTask(
    projectPath: string,
    requirementName: string,
    projectId?: string
  ): string {
    const taskId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const task: ExecutionTask = {
      id: taskId,
      projectPath,
      requirementName,
      projectId,
      status: 'pending',
      progress: [],
    };

    this.tasks.set(taskId, task);
    this.processQueue();
    return taskId;
  }

  /**
   * Get task status
   */
  getTask(taskId: string): ExecutionTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): ExecutionTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks for a specific project
   */
  getProjectTasks(projectPath: string): ExecutionTask[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.projectPath === projectPath
    );
  }

  /**
   * Clear completed tasks older than 1 hour
   */
  clearOldTasks(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [taskId, task] of this.tasks.entries()) {
      if (
        task.status === 'completed' ||
        task.status === 'failed' ||
        task.status === 'session-limit'
      ) {
        if (task.endTime && task.endTime < oneHourAgo) {
          this.tasks.delete(taskId);
        }
      }
    }
  }

  /**
   * Process the queue (non-blocking)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return; // Already processing
    }

    const pendingTask = Array.from(this.tasks.values()).find(
      (t) => t.status === 'pending'
    );

    if (!pendingTask) {
      return; // No pending tasks
    }

    this.isProcessing = true;
    const task = pendingTask;

    // Update task to running
    task.status = 'running';
    task.startTime = new Date();
    task.progress.push(`[${new Date().toISOString()}] Execution started`);

    try {
      // Execute in background (non-blocking)
      const result = await executeRequirement(
        task.projectPath,
        task.requirementName,
        (progressMsg: string) => {
          // Capture progress messages
          task.progress.push(`[${new Date().toISOString()}] ${progressMsg}`);
        }
      );

      // Update task with results
      task.endTime = new Date();
      task.logFilePath = result.logFilePath;

      if (result.success) {
        task.status = 'completed';
        task.output = result.output;
        task.progress.push(`[${new Date().toISOString()}] ✓ Execution completed successfully`);
      } else if (result.sessionLimitReached) {
        task.status = 'session-limit';
        task.error = result.error;
        task.sessionLimitReached = true;
        task.progress.push(`[${new Date().toISOString()}] ✗ Session limit reached`);
      } else {
        task.status = 'failed';
        task.error = result.error;
        task.progress.push(`[${new Date().toISOString()}] ✗ Execution failed`);
      }
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.endTime = new Date();
      task.progress.push(`[${new Date().toISOString()}] ✗ Execution error: ${task.error}`);
      console.error('Error in execution queue:', error);
    } finally {
      // Always mark as not processing, even if there was an error
      this.isProcessing = false;

      // Ensure task is never stuck in 'running' state
      if (task.status === 'running') {
        task.status = 'failed';
        task.error = 'Execution did not complete properly';
        task.endTime = new Date();
        task.progress.push(`[${new Date().toISOString()}] ✗ Task stuck in running state, marked as failed`);
      }
    }

    // Continue processing queue
    setImmediate(() => this.processQueue());
  }
}

// Singleton instance
export const executionQueue = new ClaudeExecutionQueue();
