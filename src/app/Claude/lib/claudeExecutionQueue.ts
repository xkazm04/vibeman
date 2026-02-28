/**
 * Background execution queue for Claude Code requirements
 * Allows non-blocking execution with progress tracking
 */

import { executeRequirement } from './claudeCodeManager';
import { logger } from '@/lib/logger';
import {
  emitTaskStarted,
  emitTaskCompleted,
  emitTaskFailed,
  emitTaskSessionLimit,
} from '@/lib/brain/taskNotificationEmitter';
import { signalCollector } from '@/lib/brain/signalCollector';
import { invalidateContextCache } from '@/lib/brain/brainService';
import { onTaskCompleted, resolveTaskApplications } from '@/lib/collective-memory/taskCompletionHook';
import { emitTaskChange } from './taskChangeEmitter';

export interface GitExecutionConfig {
  enabled: boolean;
  commands: string[];
  commitMessage: string;
}

export interface SessionConfig {
  sessionId?: string;        // Internal session ID (for tracking)
  claudeSessionId?: string;  // Claude CLI session ID (for --resume)
}

export interface ExecutionTask {
  id: string;
  projectPath: string;
  requirementName: string;
  projectId?: string;
  gitConfig?: GitExecutionConfig;
  sessionConfig?: SessionConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'session-limit';
  progress: string[];
  output?: string;
  error?: string;
  logFilePath?: string;
  startTime?: Date;
  endTime?: Date;
  sessionLimitReached?: boolean;
  capturedClaudeSessionId?: string;  // Claude session ID captured from output
  memoryApplicationIds?: string[];   // Collective memory application IDs for feedback loop
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
   * Notify SSE subscribers of a task state change
   */
  private notifyTaskChange(task: ExecutionTask): void {
    try {
      emitTaskChange({
        taskId: task.id,
        status: task.status,
        progressCount: task.progress.length,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Notification must never break execution flow
    }
  }

  /**
   * Publish task lifecycle event to persona event bus (fire-and-forget)
   */
  /**
   * Get list of files changed by the most recent git commit
   */
  private getChangedFiles(projectPath?: string): string[] {
    if (!projectPath) return [];
    try {
      const { execSync } = require('child_process');
      const output = execSync('git diff --name-only HEAD~1', {
        cwd: projectPath, encoding: 'utf-8', timeout: 5000,
      });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Add a new task to the queue
   */
  addTask(
    projectPath: string,
    requirementName: string,
    projectId?: string,
    gitConfig?: GitExecutionConfig,
    sessionConfig?: SessionConfig
  ): string {
    // Use requirement name as task ID for stable identification
    // This ensures the task ID matches what the frontend expects
    const taskId = requirementName;

    logger.info('Adding task to execution queue', {
      taskId,
      projectPath,
      requirementName,
      projectId,
      gitEnabled: gitConfig?.enabled,
      sessionId: sessionConfig?.sessionId,
      claudeSessionId: sessionConfig?.claudeSessionId,
      currentQueueSize: this.tasks.size,
    });

    const task: ExecutionTask = {
      id: taskId,
      projectPath,
      requirementName,
      projectId,
      gitConfig,
      sessionConfig,
      status: 'pending',
      progress: [],
    };

    this.tasks.set(taskId, task);
    this.notifyTaskChange(task);
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
   * Get tasks for a specific project by path
   */
  getProjectTasks(projectPath: string): ExecutionTask[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.projectPath === projectPath
    );
  }

  /**
   * Get tasks for a specific project by ID
   */
  getTasksByProjectId(projectId: string): ExecutionTask[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.projectId === projectId
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
    this.notifyTaskChange(task);
    logger.info('Task completed successfully', { taskId: task.id });

    // Emit task completed notification
    if (task.projectId) {
      const duration = task.startTime ? Date.now() - task.startTime.getTime() : undefined;
      emitTaskCompleted(task.id, task.requirementName, task.projectId, undefined, duration);

      // Auto-record implementation signal
      try {
        const changedFiles = this.getChangedFiles(task.projectPath);
        signalCollector.recordImplementation(task.projectId, {
          requirementId: task.id,
          requirementName: task.requirementName,
          contextId: null,
          filesCreated: [],
          filesModified: changedFiles,
          filesDeleted: [],
          success: true,
          executionTimeMs: duration || 0,
        });
        // Invalidate Brain context cache so dashboard reflects new signal
        invalidateContextCache(task.projectId);
      } catch {
        // Signal recording must never break the main flow
      }

      // Record learning in collective memory
      const changedFilesForMemory = this.getChangedFiles(task.projectPath);
      onTaskCompleted({
        projectId: task.projectId,
        taskId: task.id,
        requirementName: task.requirementName,
        success: true,
        filesChanged: changedFilesForMemory,
        durationMs: duration,
      });

      // Resolve collective memory applications as success (closes feedback loop)
      if (task.memoryApplicationIds?.length) {
        resolveTaskApplications(task.memoryApplicationIds, 'success');
      }
    }
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
    this.notifyTaskChange(task);
    task.progress.push(this.createProgressEntry('✗ Session limit reached'));
    logger.warn('Task hit session limit', { taskId: task.id });

    // Emit session limit notification
    if (task.projectId) {
      const duration = task.startTime ? Date.now() - task.startTime.getTime() : undefined;
      emitTaskSessionLimit(task.id, task.requirementName, task.projectId, duration);

      // Resolve collective memory applications as partial (session limit = incomplete)
      if (task.memoryApplicationIds?.length) {
        resolveTaskApplications(task.memoryApplicationIds, 'partial', 'Session limit reached');
      }
    }
  }

  /**
   * Helper: Update task status on failure
   */
  private handleTaskFailure(task: ExecutionTask, error: string, logFilePath?: string): void {
    task.status = 'failed';
    task.error = error;
    task.logFilePath = logFilePath;
    task.endTime = new Date();
    this.notifyTaskChange(task);
    task.progress.push(this.createProgressEntry('✗ Execution failed'));
    logger.error('Task failed', { taskId: task.id, error });

    // Emit task failed notification
    if (task.projectId) {
      const duration = task.startTime ? Date.now() - task.startTime.getTime() : undefined;
      emitTaskFailed(task.id, task.requirementName, task.projectId, error, duration);

      // Auto-record implementation signal (failure)
      try {
        const changedFiles = this.getChangedFiles(task.projectPath);
        signalCollector.recordImplementation(task.projectId, {
          requirementId: task.id,
          requirementName: task.requirementName,
          contextId: null,
          filesCreated: [],
          filesModified: changedFiles,
          filesDeleted: [],
          success: false,
          executionTimeMs: duration || 0,
          error,
        });
        // Invalidate Brain context cache so dashboard reflects new signal
        invalidateContextCache(task.projectId);
      } catch {
        // Signal recording must never break the main flow
      }

      // Record learning in collective memory
      const changedFilesForMemory = this.getChangedFiles(task.projectPath);
      onTaskCompleted({
        projectId: task.projectId,
        taskId: task.id,
        requirementName: task.requirementName,
        success: false,
        filesChanged: changedFilesForMemory,
        errorMessage: error,
        durationMs: duration,
      });

      // Resolve collective memory applications as failure (closes feedback loop)
      if (task.memoryApplicationIds?.length) {
        resolveTaskApplications(task.memoryApplicationIds, 'failure', error);
      }
    }
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
    this.notifyTaskChange(task);
    task.progress.push(this.createProgressEntry('Execution started'));

    // Emit task started notification
    if (task.projectId) {
      emitTaskStarted(task.id, task.requirementName, task.projectId);
    }

    try {
      logger.debug('Calling executeRequirement...', {
        taskId: task.id,
        gitEnabled: task.gitConfig?.enabled,
        sessionId: task.sessionConfig?.sessionId,
        claudeSessionId: task.sessionConfig?.claudeSessionId,
      });

      // Execute in background (non-blocking)
      const result = await executeRequirement(
        task.projectPath,
        task.requirementName,
        task.projectId, // Pass project ID as 3rd parameter
        (progressMsg: string) => {
          // Capture progress messages
          task.progress.push(this.createProgressEntry(progressMsg));
          this.notifyTaskChange(task);
        },
        task.gitConfig, // Pass git configuration as 5th parameter
        task.sessionConfig // Pass session configuration as 6th parameter
      );

      logger.debug('Received execution result', {
        taskId: task.id,
        success: result.success,
        hasError: !!result.error,
        hasOutput: !!result.output,
        sessionLimitReached: result.sessionLimitReached,
        logFilePath: result.logFilePath,
        capturedClaudeSessionId: result.capturedClaudeSessionId,
      });

      // Capture the session ID if available
      if (result.capturedClaudeSessionId) {
        task.capturedClaudeSessionId = result.capturedClaudeSessionId;
        task.progress.push(this.createProgressEntry(`Session ID captured: ${result.capturedClaudeSessionId}`));
      }

      // Track collective memory application IDs for feedback loop resolution
      if (result.memoryApplicationIds?.length) {
        task.memoryApplicationIds = result.memoryApplicationIds;
      }

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
        this.notifyTaskChange(task);
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
