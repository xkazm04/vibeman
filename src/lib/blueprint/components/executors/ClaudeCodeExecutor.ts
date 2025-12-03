/**
 * Claude Code Executor
 *
 * A configurable executor for running requirements through Claude Code.
 * Migrated from TaskRunner to Blueprint architecture.
 *
 * Features:
 * - Configurable execution prompt
 * - Git integration (enable/disable)
 * - Streaming log support
 * - Batch execution (up to 4 parallel batches)
 * - Polling-based status monitoring
 * - Auto-cleanup on completion
 *
 * @example
 * ```typescript
 * import { ClaudeCodeExecutor } from '@/lib/blueprint';
 *
 * const executor = new ClaudeCodeExecutor();
 * await executor.initialize({
 *   projectPath: '/path/to/project',
 *   projectId: 'proj-123',
 *   batchCount: 4,
 *   gitEnabled: true,
 *   gitCommands: ['git add .', 'git commit -m "{commitMessage}"', 'git push'],
 *   streamingLog: true,
 * });
 *
 * const result = await executor.execute([
 *   { requirementName: 'requirement-1' },
 *   { requirementName: 'requirement-2' }
 * ], context);
 * ```
 */

import { BaseExecutor, ExecutorConfig } from '../base/BaseExecutor';
import { ExecutionContext, ValidationResult } from '../../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Execution mode for batch processing
 */
export type BatchId = 'batch1' | 'batch2' | 'batch3' | 'batch4';

/**
 * Task status during execution
 */
export type TaskStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'session-limit';

/**
 * Configuration for the Claude Code Executor
 */
export interface ClaudeCodeExecutorConfig extends ExecutorConfig {
  /** Project path for requirement execution */
  projectPath: string;

  /** Project ID for tracking */
  projectId?: string;

  /** Context ID for scoping */
  contextId?: string;

  /** Development server port (for testing integration) */
  projectPort?: number;

  /** Custom run script for validation */
  runScript?: string;

  /** Number of parallel batches (1-4) */
  batchCount?: 1 | 2 | 3 | 4;

  /** Enable git operations after task completion */
  gitEnabled?: boolean;

  /** Git commands to run (supports {commitMessage} placeholder) */
  gitCommands?: string[];

  /** Template for git commit message (supports {requirementName} placeholder) */
  gitCommitMessageTemplate?: string;

  /** Enable streaming log output */
  streamingLog?: boolean;

  /** Custom execution prompt wrapper */
  executionPromptWrapper?: string;

  /** Enable screenshot capture after task completion */
  screenshotEnabled?: boolean;

  /** Polling interval in milliseconds (default: 10000) */
  pollingIntervalMs?: number;

  /** Maximum polling attempts before timeout (default: 120) */
  maxPollingAttempts?: number;

  /** Progress callback */
  onProgress?: (progress: number, message?: string) => void;

  /** Task status update callback */
  onTaskStatusChange?: (taskId: string, status: TaskStatus, error?: string) => void;

  /** Batch status update callback */
  onBatchStatusChange?: (batchId: BatchId, status: 'idle' | 'running' | 'paused' | 'completed') => void;
}

/**
 * Task input for execution
 */
export interface ExecutionTask {
  requirementName: string;
  batchId?: BatchId;
  priority?: number;
}

/**
 * Result of a single task execution
 */
export interface TaskExecutionResult {
  requirementName: string;
  status: TaskStatus;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  error?: string;
  logFilePath?: string;
}

/**
 * Result of batch execution
 */
export interface BatchExecutionResult {
  batchId: BatchId;
  tasks: TaskExecutionResult[];
  completedCount: number;
  failedCount: number;
  totalDuration: number;
}

/**
 * Data output from the executor
 */
export interface ClaudeCodeExecutorOutput {
  batches: BatchExecutionResult[];
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalDuration: number;
  gitOperationsCompleted?: boolean;
}

// ============================================================================
// Executor Implementation
// ============================================================================

/**
 * Claude Code Executor
 *
 * Executes requirements through Claude Code with configurable options.
 * Supports parallel batch execution and git integration.
 */
export class ClaudeCodeExecutor extends BaseExecutor<
  ExecutionTask[],
  ClaudeCodeExecutorOutput,
  ClaudeCodeExecutorConfig
> {
  readonly id = 'executor.claude-code';
  readonly name = 'Claude Code Executor';
  readonly description = 'Executes requirements through Claude Code with batch support and git integration';

  private executingTasks = new Set<string>();
  private activePolling = new Map<string, NodeJS.Timeout>();
  private isPaused = new Map<BatchId, boolean>();

  /**
   * Execute a batch of requirements
   */
  async execute(
    tasks: ExecutionTask[],
    context: ExecutionContext
  ): Promise<ClaudeCodeExecutorOutput> {
    this.context = context;
    const startTime = Date.now();
    const results: BatchExecutionResult[] = [];

    // Initialize batch pause states
    const batchCount = this.config.batchCount || 4;
    for (let i = 1; i <= batchCount; i++) {
      this.isPaused.set(`batch${i}` as BatchId, false);
    }

    try {
      // Validate inputs
      if (!tasks || tasks.length === 0) {
        this.log('warn', 'No tasks provided for execution');
        return {
          batches: [],
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          totalDuration: 0,
        };
      }

      if (this.config.dryRun) {
        this.log('info', 'Dry run - not executing tasks');
        return {
          batches: [],
          totalTasks: tasks.length,
          completedTasks: 0,
          failedTasks: 0,
          totalDuration: 0,
        };
      }

      // Check API health
      const apiReady = await this.checkApiHealth();
      if (!apiReady) {
        this.log('error', 'Claude Code API is not available');
        throw new Error('Claude Code API is not available');
      }

      // Assign tasks to batches if not already assigned
      const assignedTasks = this.assignTasksToBatches(tasks);

      // Group tasks by batch
      const batchGroups = this.groupTasksByBatch(assignedTasks);

      // Execute batches in parallel
      const batchPromises = Array.from(batchGroups.entries()).map(
        ([batchId, batchTasks]) => this.executeBatch(batchId, batchTasks, context)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Calculate totals
      const totalTasks = tasks.length;
      const completedTasks = results.reduce((sum, b) => sum + b.completedCount, 0);
      const failedTasks = results.reduce((sum, b) => sum + b.failedCount, 0);
      const totalDuration = Date.now() - startTime;

      // Report final progress
      this.reportProgress(100, `Completed ${completedTasks}/${totalTasks} tasks`);

      return {
        batches: results,
        totalTasks,
        completedTasks,
        failedTasks,
        totalDuration,
        gitOperationsCompleted: this.config.gitEnabled,
      };
    } catch (error) {
      this.log('error', `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      // Cleanup all polling
      this.cleanupAllPolling();
    }
  }

  /**
   * Pause a specific batch
   */
  pauseBatch(batchId: BatchId): void {
    this.isPaused.set(batchId, true);
    this.config.onBatchStatusChange?.(batchId, 'paused');
  }

  /**
   * Resume a specific batch
   */
  resumeBatch(batchId: BatchId): void {
    this.isPaused.set(batchId, false);
    this.config.onBatchStatusChange?.(batchId, 'running');
  }

  /**
   * Stop all execution
   */
  stopAll(): void {
    const batchCount = this.config.batchCount || 4;
    for (let i = 1; i <= batchCount; i++) {
      this.isPaused.set(`batch${i}` as BatchId, true);
    }
    this.cleanupAllPolling();
  }

  /**
   * Check if the Claude Code API is available
   */
  private async checkApiHealth(): Promise<boolean> {
    try {
      const response = await fetch(`/api/claude-code?projectPath=/&action=status`, {
        method: 'GET',
      });
      const contentType = response.headers.get('content-type');
      return contentType?.includes('application/json') || false;
    } catch {
      return false;
    }
  }

  /**
   * Assign tasks to batches using round-robin
   */
  private assignTasksToBatches(tasks: ExecutionTask[]): ExecutionTask[] {
    const batchCount = this.config.batchCount || 4;
    return tasks.map((task, index) => ({
      ...task,
      batchId: task.batchId || (`batch${(index % batchCount) + 1}` as BatchId),
    }));
  }

  /**
   * Group tasks by batch ID
   */
  private groupTasksByBatch(tasks: ExecutionTask[]): Map<BatchId, ExecutionTask[]> {
    const groups = new Map<BatchId, ExecutionTask[]>();

    for (const task of tasks) {
      const batchId = task.batchId || 'batch1';
      if (!groups.has(batchId)) {
        groups.set(batchId, []);
      }
      groups.get(batchId)!.push(task);
    }

    return groups;
  }

  /**
   * Execute a single batch of tasks sequentially
   */
  private async executeBatch(
    batchId: BatchId,
    tasks: ExecutionTask[],
    context: ExecutionContext
  ): Promise<BatchExecutionResult> {
    const startTime = Date.now();
    const taskResults: TaskExecutionResult[] = [];

    this.config.onBatchStatusChange?.(batchId, 'running');

    for (const task of tasks) {
      // Check if cancelled or paused
      if (this.isCancelled() || this.isPaused.get(batchId)) {
        // Add remaining tasks as not executed
        taskResults.push({
          requirementName: task.requirementName,
          status: 'idle',
        });
        continue;
      }

      const result = await this.executeTask(task, context);
      taskResults.push(result);
    }

    const completedCount = taskResults.filter(t => t.status === 'completed').length;
    const failedCount = taskResults.filter(t => t.status === 'failed' || t.status === 'session-limit').length;

    this.config.onBatchStatusChange?.(batchId, 'completed');

    return {
      batchId,
      tasks: taskResults,
      completedCount,
      failedCount,
      totalDuration: Date.now() - startTime,
    };
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    task: ExecutionTask,
    context: ExecutionContext
  ): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    const { requirementName } = task;

    try {
      this.executingTasks.add(requirementName);
      this.config.onTaskStatusChange?.(requirementName, 'running');

      // Prepare git config
      const gitConfig = this.config.gitEnabled
        ? {
            enabled: true as const,
            commands: this.config.gitCommands || ['git add .', 'git commit -m "{commitMessage}"', 'git push'],
            commitMessage: (this.config.gitCommitMessageTemplate || 'Auto-commit: {requirementName}').replace(
              '{requirementName}',
              requirementName
            ),
          }
        : undefined;

      // Start async execution
      const executeResult = await this.startAsyncExecution(requirementName, gitConfig);

      if (!executeResult.success) {
        throw new Error(executeResult.error);
      }

      // Poll for completion
      const pollResult = await this.pollForCompletion(requirementName);

      const completedAt = Date.now();

      if (pollResult.status === 'completed') {
        // Delete requirement file after successful completion
        await this.deleteRequirement(requirementName);

        this.config.onTaskStatusChange?.(requirementName, 'completed');
        this.log('info', `Task completed: ${requirementName}`);

        return {
          requirementName,
          status: 'completed',
          startedAt: startTime,
          completedAt,
          duration: completedAt - startTime,
        };
      } else {
        this.config.onTaskStatusChange?.(requirementName, pollResult.status, pollResult.error);
        this.log('warn', `Task ${pollResult.status}: ${requirementName} - ${pollResult.error || 'Unknown error'}`);

        return {
          requirementName,
          status: pollResult.status,
          startedAt: startTime,
          completedAt,
          duration: completedAt - startTime,
          error: pollResult.error,
          logFilePath: pollResult.logFilePath,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.config.onTaskStatusChange?.(requirementName, 'failed', errorMessage);
      this.log('error', `Task failed: ${requirementName} - ${errorMessage}`);

      return {
        requirementName,
        status: 'failed',
        startedAt: startTime,
        completedAt: Date.now(),
        duration: Date.now() - startTime,
        error: errorMessage,
      };
    } finally {
      this.executingTasks.delete(requirementName);
    }
  }

  /**
   * Start async requirement execution
   */
  private async startAsyncExecution(
    requirementName: string,
    gitConfig?: { enabled: true; commands: string[]; commitMessage: string }
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const response = await fetch('/api/claude-code/requirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: this.config.projectPath,
          requirementName,
          action: 'execute',
          projectId: this.config.projectId || undefined,
          gitConfig,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to start execution' };
      }

      const data = await response.json();
      return { success: true, taskId: data.taskId || requirementName };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start execution',
      };
    }
  }

  /**
   * Poll for task completion
   */
  private async pollForCompletion(
    requirementName: string
  ): Promise<{ status: TaskStatus; error?: string; logFilePath?: string }> {
    const pollingIntervalMs = this.config.pollingIntervalMs || 10000;
    const maxPollingAttempts = this.config.maxPollingAttempts || 120;

    return new Promise((resolve) => {
      let attempts = 0;

      const poll = async () => {
        attempts++;

        if (attempts > maxPollingAttempts) {
          this.stopPolling(requirementName);
          resolve({ status: 'failed', error: 'Polling timeout' });
          return;
        }

        try {
          const response = await fetch(
            `/api/claude-code/requirement?projectPath=${encodeURIComponent(this.config.projectPath)}&requirementName=${encodeURIComponent(requirementName)}&action=status`
          );

          if (!response.ok) {
            return; // Continue polling
          }

          const data = await response.json();
          const status = data.status as TaskStatus;

          if (status === 'completed' || status === 'failed' || status === 'session-limit') {
            this.stopPolling(requirementName);
            resolve({
              status,
              error: data.error,
              logFilePath: data.logFilePath,
            });
          }
        } catch {
          // Continue polling on error
        }
      };

      // Start polling
      const intervalId = setInterval(poll, pollingIntervalMs);
      this.activePolling.set(requirementName, intervalId);

      // Initial poll after delay
      setTimeout(poll, pollingIntervalMs);
    });
  }

  /**
   * Stop polling for a specific task
   */
  private stopPolling(requirementName: string): void {
    const intervalId = this.activePolling.get(requirementName);
    if (intervalId) {
      clearInterval(intervalId);
      this.activePolling.delete(requirementName);
    }
  }

  /**
   * Cleanup all active polling
   */
  private cleanupAllPolling(): void {
    this.activePolling.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.activePolling.clear();
  }

  /**
   * Delete a requirement file after completion
   */
  private async deleteRequirement(requirementName: string): Promise<void> {
    try {
      await fetch('/api/claude-code', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: this.config.projectPath,
          action: 'delete-requirement',
          requirementName,
        }),
      });
    } catch {
      // Ignore delete errors
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(config: ClaudeCodeExecutorConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.projectPath) {
      errors.push('projectPath is required');
    }

    if (config.batchCount !== undefined && (config.batchCount < 1 || config.batchCount > 4)) {
      errors.push('batchCount must be between 1 and 4');
    }

    if (config.pollingIntervalMs !== undefined && config.pollingIntervalMs < 1000) {
      errors.push('pollingIntervalMs must be at least 1000ms');
    }

    return errors.length > 0
      ? { valid: false, errors }
      : { valid: true };
  }

  /**
   * Get configuration schema
   */
  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      required: ['projectPath'],
      properties: {
        projectPath: {
          type: 'string',
          description: 'Project path for requirement execution',
        },
        projectId: {
          type: 'string',
          description: 'Project ID for tracking',
        },
        contextId: {
          type: 'string',
          description: 'Context ID for scoping',
        },
        projectPort: {
          type: 'number',
          default: 3000,
          description: 'Development server port',
        },
        runScript: {
          type: 'string',
          description: 'Custom run script for validation',
        },
        batchCount: {
          type: 'number',
          enum: [1, 2, 3, 4],
          default: 4,
          description: 'Number of parallel batches (1-4)',
        },
        gitEnabled: {
          type: 'boolean',
          default: false,
          description: 'Enable git operations after task completion',
        },
        gitCommands: {
          type: 'array',
          items: { type: 'string' },
          default: ['git add .', 'git commit -m "{commitMessage}"', 'git push'],
          description: 'Git commands to run (supports {commitMessage} placeholder)',
        },
        gitCommitMessageTemplate: {
          type: 'string',
          default: 'Auto-commit: {requirementName}',
          description: 'Template for git commit message',
        },
        streamingLog: {
          type: 'boolean',
          default: true,
          description: 'Enable streaming log output',
        },
        executionPromptWrapper: {
          type: 'string',
          description: 'Custom execution prompt wrapper',
        },
        screenshotEnabled: {
          type: 'boolean',
          default: false,
          description: 'Enable screenshot capture after task completion',
        },
        pollingIntervalMs: {
          type: 'number',
          default: 10000,
          description: 'Polling interval in milliseconds',
        },
        maxPollingAttempts: {
          type: 'number',
          default: 120,
          description: 'Maximum polling attempts before timeout',
        },
        dryRun: {
          type: 'boolean',
          default: false,
          description: 'Preview without executing',
        },
      },
    };
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): ClaudeCodeExecutorConfig {
    return {
      projectPath: '',
      batchCount: 4,
      gitEnabled: false,
      gitCommands: ['git add .', 'git commit -m "{commitMessage}"', 'git push'],
      gitCommitMessageTemplate: 'Auto-commit: {requirementName}',
      streamingLog: true,
      screenshotEnabled: false,
      pollingIntervalMs: 10000,
      maxPollingAttempts: 120,
      dryRun: false,
    };
  }

  /**
   * Get input types
   */
  getInputTypes(): string[] {
    return ['ExecutionTask[]'];
  }

  /**
   * Get output types
   */
  getOutputTypes(): string[] {
    return ['ClaudeCodeExecutorOutput'];
  }
}
