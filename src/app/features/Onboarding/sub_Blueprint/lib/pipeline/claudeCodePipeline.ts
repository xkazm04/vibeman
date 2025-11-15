/**
 * Claude Code Pipeline
 * Reusable pipeline for creating and executing Claude Code requirements
 */

import { PipelineConfig, PipelineResult, PipelineContext, PipelineStep } from './types';

/**
 * Step 1: Create requirement file
 */
const createRequirementStep: PipelineStep = {
  name: 'Create Requirement',
  weight: 20,
  execute: async (config: PipelineConfig, context: PipelineContext) => {
    context.updateProgress(10, 'Creating requirement file...');

    const response = await fetch('/api/claude-code/requirement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: config.projectPath,
        requirementName: config.requirementName,
        content: config.requirementContent,
        overwrite: true,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to create requirement file');
    }

    context.requirementPath = result.filePath;
    context.updateProgress(20, `Requirement created: ${result.fileName}`);
  },
};

/**
 * Step 2: Execute requirement asynchronously
 */
const executeRequirementStep: PipelineStep = {
  name: 'Execute Requirement',
  weight: 30,
  execute: async (config: PipelineConfig, context: PipelineContext) => {
    context.updateProgress(30, 'Starting Claude Code execution...');

    const response = await fetch('/api/claude-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'execute-requirement-async',
        projectPath: config.projectPath,
        projectId: config.projectId,
        requirementName: config.requirementName,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to execute requirement');
    }

    context.taskId = result.taskId;
    context.updateProgress(50, `Claude Code task started: ${result.taskId}`);
  },
};

/**
 * Step 3: Poll for task completion
 */
const pollTaskStatusStep: PipelineStep = {
  name: 'Monitor Execution',
  weight: 50,
  execute: async (config: PipelineConfig, context: PipelineContext) => {
    if (!context.taskId) {
      throw new Error('No task ID available for polling');
    }

    const pollInterval = 2000; // 2 seconds
    const maxPolls = 300; // 10 minutes max
    let pollCount = 0;

    while (pollCount < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      pollCount++;

      const response = await fetch('/api/claude-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-task-status',
          taskId: context.taskId,
        }),
      });

      const result = await response.json();

      if (!result.task) {
        throw new Error('Task not found');
      }

      const { status, progress = 0 } = result.task;

      // Update progress (50-100% range for this step)
      const adjustedProgress = 50 + (progress / 100) * 50;
      context.updateProgress(adjustedProgress, `Claude Code executing... (${Math.round(progress)}%)`);

      if (status === 'completed') {
        context.updateProgress(100, 'Execution completed successfully');
        context.data.executionResult = result.task.result;
        return;
      }

      if (status === 'failed') {
        throw new Error(result.task.error || 'Execution failed');
      }

      // Status is 'queued' or 'running', continue polling
    }

    throw new Error('Task execution timeout after 10 minutes');
  },
};

/**
 * Execute the full Claude Code pipeline
 */
export async function executePipeline(config: PipelineConfig): Promise<PipelineResult> {
  const context: PipelineContext = {
    data: {},
    updateProgress: (progress: number, message?: string) => {
      config.onProgress?.(progress, message);
    },
  };

  const steps: PipelineStep[] = [
    createRequirementStep,
    executeRequirementStep,
    pollTaskStatusStep,
  ];

  try {
    // Execute each step sequentially
    for (const step of steps) {
      await step.execute(config, context);
    }

    const result: PipelineResult = {
      success: true,
      taskId: context.taskId,
      requirementPath: context.requirementPath,
      data: context.data,
    };

    config.onComplete?.(result);
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Pipeline execution failed');
    config.onError?.(err);

    return {
      success: false,
      error: err.message,
      taskId: context.taskId,
      requirementPath: context.requirementPath,
    };
  }
}

/**
 * Execute pipeline without polling (fire-and-forget)
 * Use this when you just want to queue the task and let it run in background
 */
export async function executeFireAndForget(config: PipelineConfig): Promise<PipelineResult> {
  const context: PipelineContext = {
    data: {},
    updateProgress: (progress: number, message?: string) => {
      config.onProgress?.(progress, message);
    },
  };

  const steps: PipelineStep[] = [
    createRequirementStep,
    executeRequirementStep,
  ];

  try {
    for (const step of steps) {
      await step.execute(config, context);
    }

    const result: PipelineResult = {
      success: true,
      taskId: context.taskId,
      requirementPath: context.requirementPath,
    };

    config.onComplete?.(result);
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Pipeline execution failed');
    config.onError?.(err);

    return {
      success: false,
      error: err.message,
      taskId: context.taskId,
      requirementPath: context.requirementPath,
    };
  }
}
