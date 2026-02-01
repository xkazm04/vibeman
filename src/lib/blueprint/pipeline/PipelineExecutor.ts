/**
 * Pipeline Executor
 * Handles the 3-step Claude Code execution pipeline:
 * 1. Create requirement file
 * 2. Execute requirement async
 * 3. Poll for completion (optional)
 *
 * This is the core logic migrated from:
 * src/app/features/Onboarding/sub_Blueprint/lib/pipeline/claudeCodePipeline.ts
 */

import {
  PipelineConfig,
  PipelineResult,
  PipelineStepResult,
  PipelineTaskStatus,
  PIPELINE_DEFAULTS,
} from './types';

/**
 * Execute a Claude Code requirement pipeline
 */
export class PipelineExecutor {
  private cancelled = false;
  private cancelCallbacks: Array<() => void> = [];

  /**
   * Execute the full pipeline
   */
  async execute(config: PipelineConfig): Promise<PipelineResult> {
    const startTime = Date.now();
    const steps: PipelineStepResult[] = [];

    try {
      // Step 1: Create requirement file (0-20%)
      const createResult = await this.createRequirement(config, steps);
      if (!createResult.success || this.cancelled) {
        return this.buildResult(createResult, steps, startTime);
      }

      // Step 2: Execute requirement async (20-30%)
      const executeResult = await this.executeRequirement(
        config,
        createResult.requirementPath!,
        steps
      );
      if (!executeResult.success || this.cancelled) {
        return this.buildResult(executeResult, steps, startTime);
      }

      // Step 3: Poll for completion or return immediately (30-100%)
      if (config.executionMode === 'polling') {
        const pollResult = await this.pollForCompletion(
          config,
          executeResult.taskId!,
          steps
        );
        return this.buildResult(pollResult, steps, startTime);
      }

      // Fire-and-forget: return immediately
      config.onProgress?.(100, 'Task queued for execution');
      return this.buildResult(executeResult, steps, startTime);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
        steps,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Step 1: Create requirement file
   */
  private async createRequirement(
    config: PipelineConfig,
    steps: PipelineStepResult[]
  ): Promise<PipelineResult> {
    const stepStart = Date.now();
    config.onProgress?.(5, 'Creating requirement file...');

    const step: PipelineStepResult = {
      name: 'createRequirement',
      status: 'running',
      startedAt: new Date().toISOString(),
    };
    steps.push(step);

    try {
      const response = await fetch('/api/claude-code/requirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: config.projectPath,
          name: config.requirementName,
          content: config.requirementContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        step.status = 'failed';
        step.error = errorText || `HTTP ${response.status}`;
        step.completedAt = new Date().toISOString();
        step.duration = Date.now() - stepStart;
        return { success: false, error: step.error };
      }

      const data = await response.json();

      step.status = 'completed';
      step.completedAt = new Date().toISOString();
      step.duration = Date.now() - stepStart;
      step.data = { path: data.path };

      config.onProgress?.(20, 'Requirement file created');
      config.onStepComplete?.('createRequirement', data);

      return { success: true, requirementPath: data.path };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      step.status = 'failed';
      step.error = errorMessage;
      step.completedAt = new Date().toISOString();
      step.duration = Date.now() - stepStart;
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Step 2: Execute requirement async
   */
  private async executeRequirement(
    config: PipelineConfig,
    requirementPath: string,
    steps: PipelineStepResult[]
  ): Promise<PipelineResult> {
    const stepStart = Date.now();
    config.onProgress?.(25, 'Executing requirement...');

    const step: PipelineStepResult = {
      name: 'executeAsync',
      status: 'running',
      startedAt: new Date().toISOString(),
    };
    steps.push(step);

    try {
      const response = await fetch('/api/claude-code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: config.projectPath,
          requirementName: requirementPath,
          async: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        step.status = 'failed';
        step.error = errorText || `HTTP ${response.status}`;
        step.completedAt = new Date().toISOString();
        step.duration = Date.now() - stepStart;
        return { success: false, error: step.error, requirementPath };
      }

      const data = await response.json();

      step.status = 'completed';
      step.completedAt = new Date().toISOString();
      step.duration = Date.now() - stepStart;
      step.data = { taskId: data.taskId };

      config.onProgress?.(30, 'Requirement queued for execution');
      config.onStepComplete?.('executeAsync', data);

      return { success: true, taskId: data.taskId, requirementPath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      step.status = 'failed';
      step.error = errorMessage;
      step.completedAt = new Date().toISOString();
      step.duration = Date.now() - stepStart;
      return { success: false, error: errorMessage, requirementPath };
    }
  }

  /**
   * Step 3: Poll for task completion
   */
  private async pollForCompletion(
    config: PipelineConfig,
    taskId: string,
    steps: PipelineStepResult[]
  ): Promise<PipelineResult> {
    const stepStart = Date.now();
    const maxTime = config.maxPollingTime ?? PIPELINE_DEFAULTS.MAX_POLLING_TIME;
    const pollInterval = config.pollInterval ?? PIPELINE_DEFAULTS.POLL_INTERVAL;

    const step: PipelineStepResult = {
      name: 'polling',
      status: 'running',
      startedAt: new Date().toISOString(),
    };
    steps.push(step);

    while (Date.now() - stepStart < maxTime && !this.cancelled) {
      // Calculate progress (30% to 95%)
      const elapsed = Date.now() - stepStart;
      const progressPercent = 30 + Math.min(65, (elapsed / maxTime) * 65);

      config.onProgress?.(progressPercent, 'Waiting for task completion...');

      try {
        const response = await fetch(`/api/claude-code/tasks/${encodeURIComponent(taskId)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data: PipelineTaskStatus = await response.json();

          if (data.status === 'completed') {
            step.status = 'completed';
            step.completedAt = new Date().toISOString();
            step.duration = Date.now() - stepStart;
            step.data = data.result;

            config.onProgress?.(100, 'Task completed successfully');
            config.onStepComplete?.('polling', data);

            return {
              success: true,
              taskId,
              completedAt: new Date().toISOString(),
            };
          }

          if (data.status === 'failed') {
            step.status = 'failed';
            step.error = data.error || 'Task failed';
            step.completedAt = new Date().toISOString();
            step.duration = Date.now() - stepStart;

            return { success: false, error: step.error, taskId };
          }

          if (data.status === 'cancelled') {
            step.status = 'failed';
            step.error = 'Task was cancelled';
            step.completedAt = new Date().toISOString();
            step.duration = Date.now() - stepStart;

            return { success: false, error: step.error, taskId };
          }

          // Task is still running, update progress message if available
          if (data.message) {
            config.onProgress?.(progressPercent, data.message);
          }
        }
      } catch (error) {
        // Network error during polling, continue trying
        console.warn('Poll error:', error);
      }

      // Wait before next poll
      await this.sleep(pollInterval);
    }

    // Check if cancelled
    if (this.cancelled) {
      step.status = 'failed';
      step.error = 'Polling cancelled';
      step.completedAt = new Date().toISOString();
      step.duration = Date.now() - stepStart;

      return { success: false, error: 'Polling cancelled', taskId };
    }

    // Timeout
    step.status = 'failed';
    step.error = 'Task timed out';
    step.completedAt = new Date().toISOString();
    step.duration = Date.now() - stepStart;

    return { success: false, error: 'Task timed out', taskId };
  }

  /**
   * Build the final result
   */
  private buildResult(
    partialResult: Partial<PipelineResult>,
    steps: PipelineStepResult[],
    startTime: number
  ): PipelineResult {
    return {
      ...partialResult,
      steps,
      duration: Date.now() - startTime,
    } as PipelineResult;
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timeout = setTimeout(resolve, ms);
      this.cancelCallbacks.push(() => clearTimeout(timeout));
    });
  }

  /**
   * Cancel the pipeline execution
   */
  cancel(): void {
    this.cancelled = true;
    this.cancelCallbacks.forEach(cb => cb());
    this.cancelCallbacks = [];
  }

  /**
   * Check if the pipeline has been cancelled
   */
  isCancelled(): boolean {
    return this.cancelled;
  }
}

/**
 * Create and execute a pipeline with the given configuration
 * Convenience function for one-off executions
 */
export async function executePipeline(
  config: PipelineConfig
): Promise<PipelineResult> {
  const executor = new PipelineExecutor();
  return executor.execute(config);
}

/**
 * Create a requirement file without execution
 * Useful for batch operations where execution is managed separately
 */
export async function createRequirementOnly(
  projectPath: string,
  requirementName: string,
  requirementContent: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const response = await fetch('/api/claude-code/requirement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath,
        name: requirementName,
        content: requirementContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, path: data.path };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
