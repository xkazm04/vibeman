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
import { detectErrorType, getErrorDescription } from '@/app/features/Conductor/lib/selfHealing/errorClassifier';
import { buildHealingContext } from '@/app/features/Conductor/lib/selfHealing/promptPatcher';
import type { ErrorType, HealingPatch } from '@/app/features/Conductor/lib/types';

export interface GitExecutionConfig {
  enabled: boolean;
  commands: string[];
  commitMessage: string;
}

export interface SessionConfig {
  sessionId?: string;        // Internal session ID (for tracking)
  claudeSessionId?: string;  // Claude CLI session ID (for --resume)
}

/** Self-healing metadata attached to a task after error classification. */
export interface TaskHealingInfo {
  errorType: ErrorType;
  errorDescription: string;
  healingAttempt: number;       // 0 = original run, 1-3 = healing retries
  maxHealingAttempts: number;
  healingPatches: HealingPatch[];
  healed: boolean;              // true if a retry succeeded after healing
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
  healing?: TaskHealingInfo;         // Self-healing metadata from error classification
  provider?: string;                 // CLI provider used for execution
  model?: string;                    // Model used for execution
}

class ClaudeExecutionQueue {
  private tasks: Map<string, ExecutionTask> = new Map();
  private isProcessing = false;
  /** Timestamp until which new task processing is paused due to rate limiting */
  private rateLimitBackoffUntil: number = 0;

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
    sessionConfig?: SessionConfig,
    provider?: string,
    model?: string
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
      provider,
      model,
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
          provider: task.provider,
          model: task.model,
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
   * Classify an error and attach healing metadata to the task.
   * Returns the classified error type for use by retry logic.
   */
  private classifyTaskError(task: ExecutionTask, error: string): ErrorType {
    const errorType = detectErrorType(error);
    const errorDescription = getErrorDescription(errorType);
    const currentAttempt = task.healing?.healingAttempt ?? 0;

    task.healing = {
      errorType,
      errorDescription,
      healingAttempt: currentAttempt,
      maxHealingAttempts: 3,
      healingPatches: task.healing?.healingPatches ?? [],
      healed: false,
    };

    task.progress.push(this.createProgressEntry(
      `[Self-Healing] Error classified: ${errorType} — ${errorDescription}`
    ));

    logger.info('Task error classified', {
      taskId: task.id,
      errorType,
      errorDescription,
      attempt: currentAttempt,
    });

    return errorType;
  }

  /**
   * Generate a rule-based healing patch for a given error type.
   * Lightweight alternative to the full healingAnalyzer (avoids LLM call).
   */
  private generateHealingPatch(errorType: ErrorType, errorMessage: string): HealingPatch | null {
    const RULE_PATCHES: Partial<Record<ErrorType, string>> = {
      missing_context:
        '\n\n## File Discovery\nBefore modifying any file, first use the Read tool to verify it exists and understand its current content. If a file is not found, search for alternative locations using Glob.',
      tool_failure:
        '\n\n## Edit Safety\nWhen using the Edit tool, ensure old_string matches exactly (including whitespace). If an edit fails, re-read the file and retry with the correct content. Never use Edit on files you haven\'t read first.',
      dependency_missing:
        '\n\n## Dependency Awareness\nBefore importing or using any package, verify it exists in package.json. Do not add new dependencies unless explicitly required. Use existing utilities and patterns from the codebase.',
      timeout:
        '\n\n## Execution Constraint\nKeep changes focused and minimal. If the task seems too large, implement only the most critical part and document remaining work as TODO comments.',
      prompt_ambiguity:
        '\n\n## Requirement Clarification\nIf the requirement is ambiguous, make a reasonable choice and document your interpretation. Focus on the most impactful interpretation rather than asking for clarification.',
      invalid_output:
        '\n\n## Output Validation\nEnsure all outputs match the expected format. Verify API responses before proceeding to the next step. If a compilation error occurs, fix it before moving on.',
      permission_error:
        '\n\n## Permission Handling\nIf you encounter permission errors, do not attempt to change file permissions. Instead, work with files you have access to and report any permission issues.',
      rate_limit:
        '\n\n## Rate Limit\nThe API rate limit was hit. Keep changes minimal and focused to reduce token usage.',
    };

    const patchContent = RULE_PATCHES[errorType];
    if (!patchContent) return null;

    return {
      id: `patch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      pipelineRunId: 'taskrunner',
      targetType: 'prompt',
      targetId: `healing_${errorType}`,
      originalValue: '',
      patchedValue: patchContent,
      reason: `Auto-healing for ${errorType}: ${errorMessage.slice(0, 100)}`,
      errorPattern: errorMessage.slice(0, 200),
      appliedAt: new Date().toISOString(),
      reverted: false,
    };
  }

  /**
   * Helper: Update task status on failure
   */
  private handleTaskFailure(task: ExecutionTask, error: string, logFilePath?: string): void {
    // Classify the error before marking as failed
    this.classifyTaskError(task, error);

    task.status = 'failed';
    task.error = error;
    task.logFilePath = logFilePath;
    task.endTime = new Date();
    this.notifyTaskChange(task);
    task.progress.push(this.createProgressEntry('✗ Execution failed'));
    logger.error('Task failed', { taskId: task.id, error, errorType: task.healing?.errorType });

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
          provider: task.provider,
          model: task.model,
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
   * Attempt self-healing retry for a failed task.
   * Returns true if the task was re-queued for retry, false if healing is not possible.
   */
  private attemptHealing(task: ExecutionTask, errorMsg: string, logFilePath?: string): boolean {
    const MAX_HEALING_ATTEMPTS = 3;
    const currentAttempt = task.healing?.healingAttempt ?? 0;

    // Don't retry session limits, timeouts beyond attempt 1, or if max attempts reached
    if (currentAttempt >= MAX_HEALING_ATTEMPTS) return false;

    // Classify the error
    const errorType = this.classifyTaskError(task, errorMsg);

    // Don't heal unknown errors or timeouts beyond first retry
    if (errorType === 'unknown') return false;
    if (errorType === 'timeout' && currentAttempt >= 1) return false;
    if (errorType === 'permission_error') return false; // Can't self-heal permissions

    // Rate limit: backoff instead of prompt patching
    if (errorType === 'rate_limit') {
      const backoffMs = 60000; // 60 seconds default
      this.rateLimitBackoffUntil = Date.now() + backoffMs;
      task.status = 'pending';
      task.error = undefined;
      task.progress.push(this.createProgressEntry(
        `[Rate Limit] Backing off for ${backoffMs / 1000}s before retry`
      ));
      this.notifyTaskChange(task);
      logger.info('Rate limit detected, backing off', { taskId: task.id, backoffMs });
      return true;
    }

    // Generate a healing patch
    const patch = this.generateHealingPatch(errorType, errorMsg);
    if (!patch) return false;

    // Store the patch
    task.healing!.healingPatches.push(patch);
    task.healing!.healingAttempt = currentAttempt + 1;

    // Re-queue the task for retry
    task.status = 'pending';
    task.error = undefined;
    task.logFilePath = logFilePath;
    task.progress.push(this.createProgressEntry(
      `[Self-Healing] Retry ${currentAttempt + 1}/${MAX_HEALING_ATTEMPTS} — applying patch for ${errorType}`
    ));
    this.notifyTaskChange(task);

    logger.info('Task re-queued for self-healing retry', {
      taskId: task.id,
      errorType,
      attempt: currentAttempt + 1,
      patchId: patch.id,
    });

    return true;
  }

  /**
   * Record a successful healing to collective memory for future auto-injection.
   */
  private recordHealingSuccess(task: ExecutionTask): void {
    if (!task.projectId || !task.healing) return;

    try {
      const { collectiveMemoryRepository } = require('@/app/db/repositories/collective-memory.repository');
      collectiveMemoryRepository.create({
        project_id: task.projectId,
        task_id: task.id,
        memory_type: 'error_fix',
        title: `Self-healed: ${task.healing.errorType}`,
        description: `Task "${task.requirementName}" failed with ${task.healing.errorType} and was auto-healed after ${task.healing.healingAttempt} attempt(s). Applied patches: ${task.healing.healingPatches.map(p => p.reason).join('; ')}`,
        tags: ['self-healing', task.healing.errorType],
      });
    } catch {
      // Collective memory recording must never break the main flow
    }
  }

  /**
   * Build the healing context string from a task's accumulated patches.
   * This gets injected into the prompt on retry.
   */
  private getHealingContextForTask(task: ExecutionTask): string {
    if (!task.healing?.healingPatches.length) return '';
    return buildHealingContext(task.healing.healingPatches);
  }

  /**
   * Process the queue (non-blocking)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('Already processing queue, skipping...');
      return; // Already processing
    }

    // Rate limit backoff: wait before processing next task
    if (Date.now() < this.rateLimitBackoffUntil) {
      const waitMs = this.rateLimitBackoffUntil - Date.now();
      logger.info('Rate limit backoff active, deferring queue processing', { waitMs });
      setTimeout(() => this.processQueue(), waitMs);
      return;
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

      // Build healing context for retries (empty string on first run)
      const healingContext = this.getHealingContextForTask(task);

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
        task.sessionConfig, // Pass session configuration as 6th parameter
        healingContext || undefined // Pass healing context as 7th parameter
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
        // If this was a healing retry, mark as healed
        if (task.healing && task.healing.healingAttempt > 0) {
          task.healing.healed = true;
          task.progress.push(this.createProgressEntry(
            `[Self-Healing] Task healed on attempt ${task.healing.healingAttempt}!`
          ));
          this.recordHealingSuccess(task);
        }
        this.handleTaskSuccess(task, result.output, result.logFilePath);
      } else if (result.sessionLimitReached) {
        this.handleTaskSessionLimit(task, result.error, result.logFilePath);
      } else {
        const errorMsg = result.error || 'Unknown error';
        // Attempt self-healing retry if eligible
        if (this.attemptHealing(task, errorMsg, result.logFilePath)) {
          // Task has been re-queued for retry — schedule next processing cycle
          this.isProcessing = false;
          setImmediate(() => this.processQueue());
          return;
        }
        this.handleTaskFailure(task, errorMsg, result.logFilePath);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      task.error = errorMsg;
      task.endTime = new Date();
      task.progress.push(this.createProgressEntry(`✗ Execution error: ${errorMsg}`));
      // Attempt self-healing retry if eligible
      if (this.attemptHealing(task, errorMsg)) {
        this.isProcessing = false;
        setImmediate(() => this.processQueue());
        return;
      }
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
