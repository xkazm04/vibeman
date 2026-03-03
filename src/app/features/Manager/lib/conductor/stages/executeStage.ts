/**
 * Execute Stage — Dispatch tasks to CLI sessions
 *
 * Takes batched requirement files and dispatches them to CLI sessions
 * using startExecution directly (same pattern as scout stage).
 * Reads requirement file content, sends as prompt to CLI, polls for completion.
 */

import type { BalancingConfig, BatchDescriptor, ExecutionResult } from '../types';
import { readRequirement } from '@/app/Claude/sub_ClaudeCodeManager/folderManager';
import {
  startExecution,
  getExecution,
} from '@/lib/claude-terminal/cli-service';
import type { CLIProviderConfig, CLIModel, CLIProvider } from '@/lib/claude-terminal/types';

interface ExecuteInput {
  batch: BatchDescriptor;
  config: BalancingConfig;
  projectId: string;
  projectPath: string;
  projectName: string;
  abortSignal?: AbortSignal;
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
  const { batch, config, projectId, projectPath } = input;
  const results: ExecutionResult[] = [];

  for (const reqName of batch.requirementNames) {
    if (input.abortSignal?.aborted) {
      results.push({
        taskId: reqName,
        requirementName: reqName,
        success: false,
        error: 'Aborted by user',
      });
      continue;
    }

    const assignment = batch.modelAssignments[reqName];

    try {
      const result = await executeRequirement(
        projectId,
        projectPath,
        reqName,
        assignment?.provider || config.executionProvider,
        assignment?.model || config.executionModel || 'sonnet',
        input.abortSignal
      );
      results.push(result);
    } catch (error) {
      console.error(`[execute] Failed task ${reqName}:`, error);
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

  // Step 3: Poll for completion (every 5s, max 10min)
  const maxWaitMs = 10 * 60 * 1000;
  const pollIntervalMs = 5000;

  while (Date.now() - startTime < maxWaitMs) {
    if (abortSignal?.aborted) {
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

  // Timed out
  return {
    taskId: executionId,
    requirementName,
    success: false,
    error: `Execution timed out after ${maxWaitMs / 1000}s`,
    durationMs: Date.now() - startTime,
  };
}
