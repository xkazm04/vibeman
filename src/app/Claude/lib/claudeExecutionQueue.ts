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
    // Use requirement name as task ID for stable identification
    // This ensures the task ID matches what the frontend expects
    const taskId = requirementName;

    console.log('[ExecutionQueue] ➕ Adding task to queue:', {
      taskId,
      projectPath,
      requirementName,
      projectId,
      currentQueueSize: this.tasks.size,
    });

    const task: ExecutionTask = {
      id: taskId,
      projectPath,
      requirementName,
      projectId,
      status: 'pending',
      progress: [],
    };

    this.tasks.set(taskId, task);
    console.log('[ExecutionQueue] ✓ Task added, starting processing...');
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
      console.log('[ExecutionQueue] ⏸️ Already processing, skipping...');
      return; // Already processing
    }

    const pendingTask = Array.from(this.tasks.values()).find(
      (t) => t.status === 'pending'
    );

    if (!pendingTask) {
      console.log('[ExecutionQueue] ✓ No pending tasks in queue');
      return; // No pending tasks
    }

    this.isProcessing = true;
    const task = pendingTask;

    console.log('[ExecutionQueue] 🚀 Starting task execution:', {
      taskId: task.id,
      requirementName: task.requirementName,
      projectPath: task.projectPath,
    });

    // Update task to running
    task.status = 'running';
    task.startTime = new Date();
    task.progress.push(`[${new Date().toISOString()}] Execution started`);

    try {
      console.log('[ExecutionQueue] 📞 Calling executeRequirement...');

      // Execute in background (non-blocking)
      const result = await executeRequirement(
        task.projectPath,
        task.requirementName,
        task.projectId, // Pass project ID as 3rd parameter
        (progressMsg: string) => {
          // Capture progress messages
          task.progress.push(`[${new Date().toISOString()}] ${progressMsg}`);
        }
      );

      console.log('[ExecutionQueue] 📨 Received execution result:', {
        success: result.success,
        hasError: !!result.error,
        hasOutput: !!result.output,
        sessionLimitReached: result.sessionLimitReached,
        logFilePath: result.logFilePath,
      });

      // Update task with results
      task.endTime = new Date();
      task.logFilePath = result.logFilePath;

      if (result.success) {
        task.status = 'completed';
        task.output = result.output;
        task.progress.push(`[${new Date().toISOString()}] ✓ Execution completed successfully`);
        console.log('[ExecutionQueue] ✅ Task completed successfully:', task.id);
      } else if (result.sessionLimitReached) {
        task.status = 'session-limit';
        task.error = result.error;
        task.sessionLimitReached = true;
        task.progress.push(`[${new Date().toISOString()}] ✗ Session limit reached`);
        console.log('[ExecutionQueue] 🚫 Task hit session limit:', task.id);
      } else {
        task.status = 'failed';
        task.error = result.error;
        task.progress.push(`[${new Date().toISOString()}] ✗ Execution failed`);
        console.error('[ExecutionQueue] ❌ Task failed:', {
          taskId: task.id,
          error: task.error,
        });
      }
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.endTime = new Date();
      task.progress.push(`[${new Date().toISOString()}] ✗ Execution error: ${task.error}`);
      console.error('[ExecutionQueue] ❌ Exception during task execution:', {
        taskId: task.id,
        error: task.error,
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      // Always mark as not processing, even if there was an error
      this.isProcessing = false;

      // Ensure task is never stuck in 'running' state
      if (task.status === 'running') {
        task.status = 'failed';
        task.error = 'Execution did not complete properly';
        task.endTime = new Date();
        task.progress.push(`[${new Date().toISOString()}] ✗ Task stuck in running state, marked as failed`);
        console.error('[ExecutionQueue] ⚠️ Task stuck in running state, marked as failed:', task.id);
      }

      console.log('[ExecutionQueue] 📊 Task final state:', {
        taskId: task.id,
        status: task.status,
        duration: task.endTime && task.startTime
          ? `${(task.endTime.getTime() - task.startTime.getTime()) / 1000}s`
          : 'unknown',
      });
    }

    // Continue processing queue
    console.log('[ExecutionQueue] ⏭️ Scheduling next task processing...');
    setImmediate(() => this.processQueue());
  }
}

// Singleton instance
export const executionQueue = new ClaudeExecutionQueue();
