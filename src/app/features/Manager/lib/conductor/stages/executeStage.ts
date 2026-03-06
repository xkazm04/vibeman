/**
 * Execute Stage — DAG-aware parallel dispatch to CLI sessions
 *
 * Uses DAGScheduler to resolve task dependencies (from batchStage's
 * dagDependencies) and execute independent tasks in parallel, up to
 * config.maxConcurrentTasks. Tasks whose dependencies have all completed
 * are dispatched immediately; tasks blocked by unfinished deps wait.
 */

import type { BalancingConfig, BatchDescriptor, ExecutionResult, ExecutionTaskState } from '../types';
import { DAGScheduler, type DAGTask, type DAGTaskStatus } from '@/lib/dag/dagScheduler';
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
 * Execute the Execute stage: dispatch tasks to CLI via DAG-aware parallelism.
 *
 * 1. Build DAGTask[] from batch.dagDependencies
 * 2. Loop: ask DAGScheduler for the next ready batch (respecting maxConcurrentTasks)
 * 3. Dispatch ready tasks in parallel, await all, update DAG state
 * 4. Repeat until DAG is finished (all completed/failed/blocked)
 */
export async function executeExecuteStage(input: ExecuteInput): Promise<ExecuteStageResult> {
  const { batch, config, projectId, projectPath, onTaskUpdate } = input;
  const results: ExecutionResult[] = [];
  const maxParallel = config.maxConcurrentTasks || 2;

  // Build initial task state map (keyed by reqName for fast lookup)
  const taskStateMap = new Map<string, ExecutionTaskState>();
  for (const reqName of batch.requirementNames) {
    const assignment = batch.modelAssignments[reqName];
    taskStateMap.set(reqName, {
      requirementName: reqName,
      provider: (assignment?.provider || config.executionProvider) as CLIProvider,
      model: assignment?.model || config.executionModel || 'sonnet',
      status: 'pending' as const,
    });
  }
  const emitUpdate = () => onTaskUpdate?.([...taskStateMap.values()]);
  emitUpdate();

  // Build DAGTask list from batch dependencies
  const dagTasks: DAGTask[] = batch.requirementNames.map((reqName) => ({
    id: reqName,
    status: 'pending' as DAGTaskStatus,
    dependencies: batch.dagDependencies[reqName] || [],
  }));

  const scheduler = new DAGScheduler({ maxParallel });

  // Validate — log warning but proceed (treat cycles as independent)
  const cycleError = scheduler.validateNoCycles(dagTasks);
  if (cycleError) {
    console.warn(`[execute] DAG cycle detected, proceeding anyway: ${cycleError}`);
  }

  // DAG execution loop
  while (true) {
    if (input.abortSignal?.aborted) {
      // Abort all remaining pending tasks
      for (const dt of dagTasks) {
        if (dt.status === 'pending' || dt.status === 'running') {
          dt.status = 'failed';
          const ts = taskStateMap.get(dt.id)!;
          ts.status = 'aborted';
          ts.error = 'Aborted by user';
          results.push({
            taskId: dt.id,
            requirementName: dt.id,
            success: false,
            error: 'Aborted by user',
          });
        }
      }
      emitUpdate();
      break;
    }

    const state = scheduler.getState(dagTasks);

    if (state.isFinished) break;

    const nextBatch = scheduler.getNextBatch(dagTasks);
    if (nextBatch.length === 0 && state.running.length === 0) {
      // Nothing ready and nothing running — everything is blocked by failures
      break;
    }

    if (nextBatch.length === 0) {
      // Tasks are still running, wait before re-checking
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    // Mark tasks as running and dispatch in parallel
    const dispatched: Promise<{ reqName: string; result: ExecutionResult }>[] = [];

    for (const reqName of nextBatch) {
      const dagTask = dagTasks.find((t) => t.id === reqName)!;
      dagTask.status = 'running';

      const ts = taskStateMap.get(reqName)!;
      ts.status = 'running';
      ts.startedAt = new Date().toISOString();
      emitUpdate();

      dispatched.push(
        executeRequirement(
          projectId,
          projectPath,
          reqName,
          ts.provider,
          ts.model,
          config.executionTimeoutMs || 6000 * 1000,
          input.abortSignal
        )
          .then((result) => ({ reqName, result }))
          .catch((error) => ({
            reqName,
            result: {
              taskId: reqName,
              requirementName: reqName,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            } as ExecutionResult,
          }))
      );
    }

    // Await all dispatched tasks in this wave
    const settled = await Promise.all(dispatched);

    for (const { reqName, result } of settled) {
      const dagTask = dagTasks.find((t) => t.id === reqName)!;
      dagTask.status = result.success ? 'completed' : 'failed';

      const ts = taskStateMap.get(reqName)!;
      ts.status = result.success ? 'completed' : 'failed';
      ts.executionId = result.taskId;
      ts.durationMs = result.durationMs;
      if (result.error) ts.error = result.error;

      results.push(result);
    }
    emitUpdate();
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
