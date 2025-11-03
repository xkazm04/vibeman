/**
 * Background execution queue for Claude Code requirements
 * Allows non-blocking execution with progress tracking
 */

import { executeRequirement } from './claudeCodeManager';
import { logger } from '@/lib/logger';

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
   * Helper: Create a progress log entry
   */
  private createProgressEntry(message: string): string {
    return `[${new Date().toISOString()}] ${message}`;
  }

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

    logger.info('Adding task to execution queue', {
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
    logger.debug('Task added, starting processing...');
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
   * Helper: Update task status on completion
   */
  private handleTaskSuccess(task: ExecutionTask, output?: string, logFilePath?: string): void {
    task.status = 'completed';
    task.output = output;
    task.logFilePath = logFilePath;
    task.endTime = new Date();
    task.progress.push(this.createProgressEntry('✓ Execution completed successfully'));
    logger.info('Task completed successfully', { taskId: task.id });
  }

  /**
   * Helper: Update task status on session limit
   */
  private handleTaskSessionLimit(task: ExecutionTask, error?: string, logFilePath?: string): void {
    task.status = 'session-limit';
    task.error = error;
    task.sessionLimitReached = true;
    task.logFilePath = logFilePath;
    task.endTime = new Date();
    task.progress.push(this.createProgressEntry('✗ Session limit reached'));
    logger.warn('Task hit session limit', { taskId: task.id });
  }

  /**
   * Helper: Update task status on failure
   */
  private handleTaskFailure(task: ExecutionTask, error: string, logFilePath?: string): void {
    task.status = 'failed';
    task.error = error;
    task.logFilePath = logFilePath;
    task.endTime = new Date();
    task.progress.push(this.createProgressEntry('✗ Execution failed'));
    logger.error('Task failed', { taskId: task.id, error });
  }

  /**
   * Process the queue (non-blocking)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('Already processing queue, skipping...');
      return; // Already processing
    }

    const pendingTask = Array.from(this.tasks.values()).find(
      (t) => t.status === 'pending'
    );

    if (!pendingTask) {
      logger.debug('No pending tasks in queue');
      return; // No pending tasks
    }

    this.isProcessing = true;
    const task = pendingTask;

    logger.info('Starting task execution', {
      taskId: task.id,
      requirementName: task.requirementName,
      projectPath: task.projectPath,
    });

    // Update task to running
    task.status = 'running';
    task.startTime = new Date();
    task.progress.push(this.createProgressEntry('Execution started'));

    try {
      logger.debug('Calling executeRequirement...', { taskId: task.id });

      // Execute in background (non-blocking)
      const result = await executeRequirement(
        task.projectPath,
        task.requirementName,
        task.projectId, // Pass project ID as 3rd parameter
        (progressMsg: string) => {
          // Capture progress messages
          task.progress.push(this.createProgressEntry(progressMsg));
        }
      );

      logger.debug('Received execution result', {
        taskId: task.id,
        success: result.success,
        hasError: !!result.error,
        hasOutput: !!result.output,
        sessionLimitReached: result.sessionLimitReached,
        logFilePath: result.logFilePath,
      });

      // Update task with results
      if (result.success) {
        this.handleTaskSuccess(task, result.output, result.logFilePath);
      } else if (result.sessionLimitReached) {
        this.handleTaskSessionLimit(task, result.error, result.logFilePath);
      } else {
        this.handleTaskFailure(task, result.error || 'Unknown error', result.logFilePath);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      task.error = errorMsg;
      task.endTime = new Date();
      task.progress.push(this.createProgressEntry(`✗ Execution error: ${errorMsg}`));
      this.handleTaskFailure(task, errorMsg);

      logger.error('Exception during task execution', {
        taskId: task.id,
        error: errorMsg,
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
        task.progress.push(this.createProgressEntry('✗ Task stuck in running state, marked as failed'));
        logger.error('Task stuck in running state, marked as failed', { taskId: task.id });
      }

      logger.debug('Task final state', {
        taskId: task.id,
        status: task.status,
        duration: task.endTime && task.startTime
          ? `${(task.endTime.getTime() - task.startTime.getTime()) / 1000}s`
          : 'unknown',
      });
    }

    // Continue processing queue
    logger.debug('Scheduling next task processing...');
    setImmediate(() => this.processQueue());
  }
}

// Singleton instance
export const executionQueue = new ClaudeExecutionQueue();
