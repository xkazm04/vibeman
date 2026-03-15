/**
 * Execute Stage — Domain-scheduler-aware parallel dispatch to CLI sessions
 *
 * Uses domainScheduler to resolve file-path overlap conflicts and execute
 * non-overlapping specs in parallel, up to config.maxConcurrentTasks.
 * Specs that touch the same files are serialized; non-overlapping specs run in parallel.
 *
 * After each CLI exit, file verification checks whether expected file changes
 * actually occurred. Exit-0 with no file changes marks the spec as failed.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { BalancingConfig, ExecutionResult, ExecutionTaskState, SpecMetadata } from '../types';
import { getNextBatch, getAllPaths, type SchedulerState } from '../execution/domainScheduler';
import { snapshotFiles, verifyExecution, type FileSnapshot } from '../execution/fileVerifier';
import { specRepository } from '../spec/specRepository';
import { specFileManager } from '../spec/specFileManager';
import {
  startExecution,
  getExecution,
  abortExecution,
} from '@/lib/claude-terminal/cli-service';
import type { CLIProviderConfig, CLIModel, CLIProvider } from '@/lib/claude-terminal/types';

interface ExecuteInput {
  runId: string;
  config: BalancingConfig;
  projectId: string;
  projectPath: string;
  projectName: string;
  abortSignal?: AbortSignal;
  onTaskUpdate?: (tasks: ExecutionTaskState[]) => void;
  maxRetries?: number;
}

interface ExecuteStageResult {
  results: ExecutionResult[];
  allCompleted: boolean;
}

/**
 * Execute the Execute stage: dispatch specs to CLI via domain-scheduler-aware parallelism.
 *
 * 1. Read specs from DB via specRepository
 * 2. Initialize SchedulerState from pending specs
 * 3. Loop: ask domainScheduler for non-overlapping batch (respecting maxConcurrentTasks)
 * 4. Dispatch ready specs in parallel, verify file changes on completion
 * 5. Repeat until all specs are completed/failed
 */
export async function executeExecuteStage(input: ExecuteInput): Promise<ExecuteStageResult> {
  const { runId, config, projectId, projectPath, onTaskUpdate } = input;
  const results: ExecutionResult[] = [];
  const maxParallel = config.maxConcurrentTasks || 2;
  const maxRetries = input.maxRetries ?? 2;

  // Retry tracking
  const retryCount = new Map<string, number>();
  const retryErrors = new Map<string, string>();

  // Read specs from DB
  const allSpecs = specRepository.getSpecsByRunId(runId);
  const pendingSpecs = allSpecs.filter((s) => s.status === 'pending');

  // Build initial task state map (keyed by spec ID for fast lookup)
  const taskStateMap = new Map<string, ExecutionTaskState>();
  for (const spec of pendingSpecs) {
    taskStateMap.set(spec.id, {
      requirementName: spec.slug,
      provider: config.executionProvider as CLIProvider,
      model: config.executionModel || 'sonnet',
      status: 'pending' as const,
    });
  }
  const emitUpdate = () => onTaskUpdate?.([...taskStateMap.values()]);
  emitUpdate();

  // Initialize scheduler state
  const schedulerState: SchedulerState = {
    pending: [...pendingSpecs],
    running: new Map(),
    completed: new Set(),
    failed: new Set(),
  };

  // Domain scheduler execution loop
  while (true) {
    if (input.abortSignal?.aborted) {
      // Abort all remaining pending/running specs
      for (const spec of schedulerState.pending) {
        const ts = taskStateMap.get(spec.id);
        if (ts) {
          ts.status = 'aborted';
          ts.error = 'Aborted by user';
        }
        specRepository.updateSpecStatus(spec.id, 'failed');
        results.push({
          taskId: spec.id,
          requirementName: spec.slug,
          success: false,
          error: 'Aborted by user',
        });
      }
      emitUpdate();
      break;
    }

    const nextBatch = getNextBatch(schedulerState, maxParallel);

    if (nextBatch.length === 0 && schedulerState.running.size > 0) {
      // Specs are still running, wait before re-checking
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    if (nextBatch.length === 0) {
      // Nothing ready and nothing running — all done or blocked
      break;
    }

    // Mark specs as running and dispatch in parallel
    const dispatched: Promise<{ specId: string; result: ExecutionResult }>[] = [];

    for (const spec of nextBatch) {
      // Update scheduler state
      const specPaths = getAllPaths(spec.affectedFiles);
      schedulerState.running.set(spec.id, specPaths);
      schedulerState.pending = schedulerState.pending.filter((s) => s.id !== spec.id);

      // Update DB status BEFORE dispatch
      specRepository.updateSpecStatus(spec.id, 'executing');

      const ts = taskStateMap.get(spec.id);
      if (ts) {
        ts.status = 'running';
        ts.startedAt = new Date().toISOString();
      }
      emitUpdate();

      const errorContext = retryErrors.get(spec.id);

      dispatched.push(
        executeSpec(
          projectId,
          projectPath,
          runId,
          spec,
          config.executionProvider as string,
          config.executionModel || 'sonnet',
          config.executionTimeoutMs || 6000 * 1000,
          input.abortSignal,
          errorContext
        )
          .then((result) => ({ specId: spec.id, result }))
          .catch((error) => ({
            specId: spec.id,
            result: {
              taskId: spec.id,
              requirementName: spec.slug,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            } as ExecutionResult,
          }))
      );
    }

    // Await all dispatched specs in this wave
    const settled = await Promise.all(dispatched);

    let rateLimitDetected = false;
    for (const { specId, result } of settled) {
      // Update scheduler state
      schedulerState.running.delete(specId);

      if (result.success) {
        schedulerState.completed.add(specId);
        specRepository.updateSpecStatus(specId, 'completed');

        const ts = taskStateMap.get(specId);
        if (ts) {
          ts.status = 'completed';
          ts.executionId = result.taskId;
          ts.durationMs = result.durationMs;
        }

        results.push(result);
      } else {
        // Check if we can retry
        const currentRetries = retryCount.get(specId) || 0;
        const isAbort = result.error?.includes('Aborted by user');
        const isRateLimit = result.error && /rate.?limit|429|too many requests|quota.?exceeded/i.test(result.error);

        if (currentRetries < maxRetries && result.error && !isAbort) {
          // Re-queue for retry with error context
          retryCount.set(specId, currentRetries + 1);
          retryErrors.set(specId, result.error);
          const originalSpec = allSpecs.find((s) => s.id === specId);
          if (originalSpec) {
            schedulerState.pending.push(originalSpec);
            specRepository.updateSpecStatus(specId, 'pending');
            const ts = taskStateMap.get(specId);
            if (ts) {
              ts.status = 'pending';
              ts.error = `Retry ${currentRetries + 1}/${maxRetries}: ${result.error}`;
            }
            console.log(`[execute] Retrying spec ${originalSpec.slug} (attempt ${currentRetries + 2}/${maxRetries + 1}): ${result.error}`);
            // Don't push to results yet — wait for retry outcome
            if (isRateLimit) rateLimitDetected = true;
            continue;
          }
        }

        // Exhausted retries or non-retryable — mark as failed
        schedulerState.failed.add(specId);
        specRepository.updateSpecStatus(specId, 'failed');

        const ts = taskStateMap.get(specId);
        if (ts) {
          ts.status = 'failed';
          ts.executionId = result.taskId;
          ts.durationMs = result.durationMs;
          if (result.error) ts.error = result.error;
        }

        if (isRateLimit) rateLimitDetected = true;

        results.push(result);
      }
    }
    emitUpdate();

    // Rate limit backoff: pause before dispatching next wave
    if (rateLimitDetected) {
      console.log('[execute] Rate limit detected, backing off 60s before next wave');
      await new Promise((r) => setTimeout(r, 60000));
    }
  }

  const allCompleted = results.every((r) => r.success);

  return { results, allCompleted };
}

async function executeSpec(
  projectId: string,
  projectPath: string,
  runId: string,
  spec: SpecMetadata,
  provider: string,
  model: string,
  timeoutMs: number,
  abortSignal?: AbortSignal,
  retryContext?: string
): Promise<ExecutionResult> {
  const startTime = Date.now();

  // Step 1: Read the spec file content from disk
  const specDir = path.join(process.cwd(), '.conductor', 'runs', runId, 'specs');
  const filename = specFileManager.formatFilename(spec.sequenceNumber, spec.slug);
  const specFilePath = path.join(specDir, filename);

  let specContent: string;
  try {
    specContent = fs.readFileSync(specFilePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read spec file "${specFilePath}": ${error instanceof Error ? error.message : String(error)}`);
  }

  // Prepend retry context if this is a retry attempt
  if (retryContext) {
    specContent = `PREVIOUS ATTEMPT FAILED\n\nThe previous attempt to implement this spec failed with the following error:\n\n${retryContext}\n\nPlease fix the issues and try again. Pay special attention to the error above.\n\n---\n\n${specContent}`;
  }

  // Step 2: Take file snapshots BEFORE dispatch (for post-execution verification)
  const filesToSnapshot = [...spec.affectedFiles.modify, ...spec.affectedFiles.create];
  const beforeSnapshots: FileSnapshot[] = snapshotFiles(projectPath, filesToSnapshot);

  // Step 3: Dispatch to CLI via startExecution
  const providerConfig: CLIProviderConfig = {
    provider: provider as CLIProvider,
    model: (model || undefined) as CLIModel | undefined,
    useWorktree: false, // Domain isolation replaces worktree
  };

  const executionId = startExecution(
    projectPath,
    specContent,
    undefined, // no resume session
    undefined, // no onEvent callback
    providerConfig,
    {
      VIBEMAN_PROJECT_ID: projectId,
      VIBEMAN_SPEC_ID: spec.id,
    }
  );

  console.log(`[execute] Started CLI execution ${executionId} for spec ${spec.slug} (${provider}/${model})`);

  // Step 4: Poll for completion
  const maxWaitMs = timeoutMs;
  const pollIntervalMs = 5000;

  while (Date.now() - startTime < maxWaitMs) {
    if (abortSignal?.aborted) {
      abortExecution(executionId);
      return {
        taskId: executionId,
        requirementName: spec.slug,
        success: false,
        error: 'Aborted by user',
        durationMs: Date.now() - startTime,
        provider,
        model,
      };
    }

    const execution = getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found -- may have been cleaned up`);
    }

    if (execution.status === 'completed') {
      // Step 5: Post-execution file verification
      const verification = verifyExecution(projectPath, spec.affectedFiles, beforeSnapshots);
      if (!verification.passed) {
        console.log(`[execute] Spec ${spec.slug} CLI exited 0 but file verification failed: ${verification.reason}`);
        return {
          taskId: executionId,
          requirementName: spec.slug,
          success: false,
          error: `File verification failed: ${verification.reason}`,
          durationMs: Date.now() - startTime,
          provider,
          model,
        };
      }

      return {
        taskId: executionId,
        requirementName: spec.slug,
        success: true,
        filesChanged: [
          ...spec.affectedFiles.create,
          ...spec.affectedFiles.modify,
        ],
        durationMs: Date.now() - startTime,
        provider,
        model,
      };
    }

    if (execution.status === 'error' || execution.status === 'aborted') {
      // Non-zero exit -- mark failed directly (no file check needed)
      return {
        taskId: executionId,
        requirementName: spec.slug,
        success: false,
        error: `CLI execution ${execution.status}`,
        durationMs: Date.now() - startTime,
        provider,
        model,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // Timed out -- kill the CLI process
  abortExecution(executionId);
  return {
    taskId: executionId,
    requirementName: spec.slug,
    success: false,
    error: `Execution timed out after ${maxWaitMs / 1000}s`,
    durationMs: Date.now() - startTime,
    provider,
    model,
  };
}
