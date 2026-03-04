/**
 * Execute Stage — Dispatch tasks to CLI sessions
 *
 * Takes batched requirement files and dispatches them to CLI sessions
 * using startExecution directly (same pattern as scout stage).
 * Reads requirement file content, sends as prompt to CLI, polls for completion.
 */

import type { BalancingConfig, BatchDescriptor, ExecutionResult, ExecutionTaskState } from '../types';
import { readRequirement } from '@/app/Claude/sub_ClaudeCodeManager/folderManager';
import {
  startExecution,
  getExecution,
  abortExecution,
} from '@/lib/claude-terminal/cli-service';
import type { CLIProviderConfig, CLIModel, CLIProvider } from '@/lib/claude-terminal/types';

interface ExecuteInput {
  batch: BatchDescriptor;
  config: BalancingConfig;
  projectId: string;
  projectPath: string;
  projectName: string;
  abortSignal?: AbortSignal;
  onTaskUpdate?: (tasks: ExecutionTaskState[]) => void;
}

interface ExecuteStageResult {
  results: ExecutionResult[];
  allCompleted: boolean;
}

/**
 * Execute the Execute stage: dispatch tasks to CLI and collect results.
 *
 * For each requirement:
 * 1. Read the requirement file content from .claude/commands/
 * 2. Dispatch to CLI via startExecution with content as prompt
 * 3. Poll for completion via getExecution
 */
export async function executeExecuteStage(input: ExecuteInput): Promise<ExecuteStageResult> {
  const { batch, config, projectId, projectPath, onTaskUpdate } = input;
  const results: ExecutionResult[] = [];

  // Build initial task state array
  const taskStates: ExecutionTaskState[] = batch.requirementNames.map((reqName) => {
    const assignment = batch.modelAssignments[reqName];
    return {
      requirementName: reqName,
      provider: (assignment?.provider || config.executionProvider) as CLIProvider,
      model: assignment?.model || config.executionModel || 'sonnet',
      status: 'pending' as const,
    };
  });
  onTaskUpdate?.(taskStates);

  for (let i = 0; i < batch.requirementNames.length; i++) {
    const reqName = batch.requirementNames[i];

    if (input.abortSignal?.aborted) {
      taskStates[i].status = 'aborted';
      onTaskUpdate?.(taskStates);
      results.push({
        taskId: reqName,
        requirementName: reqName,
        success: false,
        error: 'Aborted by user',
      });
      continue;
    }

    // Mark task as running
    taskStates[i].status = 'running';
    taskStates[i].startedAt = new Date().toISOString();
    onTaskUpdate?.(taskStates);

    try {
      const result = await executeRequirement(
        projectId,
        projectPath,
        reqName,
        taskStates[i].provider,
        taskStates[i].model,
        config.executionTimeoutMs || 6000 * 1000,
        input.abortSignal
      );

      // Update task state from result
      taskStates[i].status = result.success ? 'completed' : 'failed';
      taskStates[i].executionId = result.taskId;
      taskStates[i].durationMs = result.durationMs;
      if (result.error) taskStates[i].error = result.error;
      onTaskUpdate?.(taskStates);

      results.push(result);
    } catch (error) {
      console.error(`[execute] Failed task ${reqName}:`, error);
      taskStates[i].status = 'failed';
      taskStates[i].error = error instanceof Error ? error.message : String(error);
      onTaskUpdate?.(taskStates);

      results.push({
        taskId: reqName,
        requirementName: reqName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const allCompleted = results.every((r) => r.success);

  return { results, allCompleted };
}

async function executeRequirement(
  projectId: string,
  projectPath: string,
  requirementName: string,
  provider: string,
  model: string,
  timeoutMs: number,
  abortSignal?: AbortSignal
): Promise<ExecutionResult> {
  const startTime = Date.now();

  // Step 1: Read the requirement file content
  const reqResult = readRequirement(projectPath, requirementName);
  if (!reqResult.success || !reqResult.content) {
    throw new Error(`Failed to read requirement "${requirementName}": ${reqResult.error || 'File not found'}`);
  }

  // Step 2: Dispatch to CLI via startExecution
  const providerConfig: CLIProviderConfig = {
    provider: provider as CLIProvider,
    model: (model || undefined) as CLIModel | undefined,
  };

  const executionId = startExecution(
    projectPath,
    reqResult.content,
    undefined, // no resume session
    undefined, // no onEvent callback
    providerConfig,
    {
      VIBEMAN_PROJECT_ID: projectId,
      VIBEMAN_REQUIREMENT: requirementName,
    }
  );

  console.log(`[execute] Started CLI execution ${executionId} for ${requirementName} (${provider}/${model})`);

  // Step 3: Poll for completion
  const maxWaitMs = timeoutMs;
  const pollIntervalMs = 5000;

  while (Date.now() - startTime < maxWaitMs) {
    if (abortSignal?.aborted) {
      abortExecution(executionId);
      return {
        taskId: executionId,
        requirementName,
        success: false,
        error: 'Aborted by user',
        durationMs: Date.now() - startTime,
      };
    }

    const execution = getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found — may have been cleaned up`);
    }

    if (execution.status === 'completed') {
      return {
        taskId: executionId,
        requirementName,
        success: true,
        durationMs: Date.now() - startTime,
      };
    }

    if (execution.status === 'error' || execution.status === 'aborted') {
      return {
        taskId: executionId,
        requirementName,
        success: false,
        error: `CLI execution ${execution.status}`,
        durationMs: Date.now() - startTime,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // Timed out — kill the CLI process
  abortExecution(executionId);
  return {
    taskId: executionId,
    requirementName,
    success: false,
    error: `Execution timed out after ${maxWaitMs / 1000}s`,
    durationMs: Date.now() - startTime,
  };
}
