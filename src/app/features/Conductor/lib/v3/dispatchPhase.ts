/**
 * DISPATCH Phase — Conductor v3
 *
 * Zero LLM calls. Pure orchestration replacing Batch + SpecWriter + Execute.
 * Composes rich prompts directly from task descriptions, dispatches to CLI
 * with dependency-aware parallel scheduling, verifies file changes, and
 * commits per task.
 */

import {
  startExecution,
  getExecution,
  abortExecution,
} from '@/lib/claude-terminal/cli-service';
import { snapshotFiles, verifyExecution } from '../execution/fileVerifier';
import { hasOverlap } from '../execution/domainScheduler';
import { commitPerTask } from '../review/gitCommitter';
import { routeModel } from '../balancingEngine';
import type { CLIProvider, CLIProviderConfig } from '@/lib/claude-terminal/types';
import type { V3Task, V3TaskResult, V3Config, V3Phase, V3Metrics } from './types';
import { v3ConfigToBalancing } from './types';
import {
  createWorktree,
  mergeWorktreeBranch,
  removeWorktree,
  cleanupRunWorktrees,
  type WorktreeInfo,
} from './worktreeManager';

// ============================================================================
// Input/Output Types
// ============================================================================

export interface DispatchPhaseInput {
  runId: string;
  projectId: string;
  projectPath: string;
  projectName: string;
  tasks: V3Task[];
  config: V3Config;
  goalContext: { title: string; description: string };
  healingContext: string;
  autoCommit: boolean;
  abortSignal?: AbortSignal;
  onTaskUpdate?: (tasks: V3Task[]) => void;
  onLog?: (phase: V3Phase, event: string, message: string) => void;
  metrics?: V3Metrics;
}

// ============================================================================
// Main Export
// ============================================================================

export async function executeDispatchPhase(input: DispatchPhaseInput): Promise<{
  results: V3TaskResult[];
  tasks: V3Task[];
}> {
  const {
    runId, projectId, projectPath, projectName, tasks, config,
    goalContext, healingContext, autoCommit, abortSignal, onTaskUpdate, onLog,
    metrics,
  } = input;

  const results: V3TaskResult[] = [];
  const maxParallel = config.maxConcurrentTasks || 2;
  const maxRetries = 2;
  const balancingConfig = v3ConfigToBalancing(config);
  const worktreeMode = config.useWorktrees === true;

  // Retry tracking
  const retryCount = new Map<string, number>();
  const retryErrors = new Map<string, string>();

  // Worktree tracking
  const activeWorktrees = new Map<string, WorktreeInfo>();

  // Scheduler state
  const pending = new Set(tasks.map(t => t.id));
  const running = new Map<string, Set<string>>(); // taskId -> claimed paths
  const completed = new Set<string>();
  const failed = new Set<string>();

  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const emitUpdate = () => onTaskUpdate?.(tasks);

  try {
    // Execution loop
    while (true) {
      if (abortSignal?.aborted) {
        for (const taskId of pending) {
          const task = taskMap.get(taskId)!;
          task.status = 'failed';
          task.result = {
            success: false, error: 'Aborted by user',
            filesChanged: [], durationMs: 0, provider: '', model: '',
          };
          results.push(task.result);
        }
        emitUpdate();
        break;
      }

      const nextBatch = getNextBatch(tasks, pending, running, completed, failed, maxParallel, worktreeMode);

      if (nextBatch.length === 0 && running.size > 0) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      if (nextBatch.length === 0) break;

      // Dispatch batch in parallel
      const dispatched: Promise<{ taskId: string; result: V3TaskResult }>[] = [];

      for (const task of nextBatch) {
        pending.delete(task.id);
        const taskPaths = new Set(task.targetFiles.map(f => f.replace(/\\/g, '/')));
        running.set(task.id, taskPaths);

        task.status = 'running';
        emitUpdate();

        const errorContext = retryErrors.get(task.id);

        // Determine effective project path (worktree or original)
        let effectivePath = projectPath;
        if (worktreeMode) {
          const wtResult = createWorktree(projectPath, runId, task.id);
          if (wtResult.success) {
            effectivePath = wtResult.worktreePath;
            activeWorktrees.set(task.id, {
              taskId: task.id,
              worktreePath: wtResult.worktreePath,
              branchName: wtResult.branchName,
              createdAt: Date.now(),
              status: 'active',
            });
            if (metrics) metrics.worktreesCreated++;
            onLog?.('dispatch', 'info', `Worktree created for: ${task.title}`);
          } else {
            // Fall back to non-worktree for this task
            onLog?.('dispatch', 'info', `Worktree creation failed for ${task.title}, using main tree: ${wtResult.error}`);
          }
        }

        dispatched.push(
          dispatchTask(task, {
            projectId, projectPath: effectivePath, projectName, runId,
            goalContext, healingContext, errorContext,
            config: balancingConfig, v3Config: config,
            autoCommit: worktreeMode ? false : autoCommit, // Don't auto-commit in worktree — merge handles it
            abortSignal,
          })
            .then(result => ({ taskId: task.id, result }))
            .catch(error => ({
              taskId: task.id,
              result: {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                filesChanged: [], durationMs: 0, provider: '', model: '',
              } as V3TaskResult,
            }))
        );
      }

      const settled = await Promise.all(dispatched);

      // Worktree merge phase: merge successful tasks back to main branch
      if (worktreeMode) {
        for (const { taskId, result } of settled) {
          const wt = activeWorktrees.get(taskId);
          if (!wt) continue;

          if (result.success) {
            const task = taskMap.get(taskId)!;
            const mergeResult = mergeWorktreeBranch(projectPath, wt.branchName, task.title, taskId);

            if (mergeResult.success) {
              wt.status = 'merged';
              if (mergeResult.commitSha) result.commitSha = mergeResult.commitSha;
              onLog?.('dispatch', 'info', `Merged worktree branch for: ${task.title}`);
            } else {
              // Merge conflict — mark task as failed for retry with conflict context
              wt.status = 'conflict';
              result.success = false;
              result.error = mergeResult.error || 'Merge conflict';
              if (metrics) metrics.mergeConflicts++;
              onLog?.('dispatch', 'info', `Merge conflict for: ${task.title} — ${mergeResult.conflictFiles?.join(', ')}`);
            }
          }

          // Clean up worktree regardless of outcome
          removeWorktree(projectPath, wt.worktreePath, wt.branchName);
          wt.status = wt.status === 'merged' ? 'cleaned' : wt.status;
          activeWorktrees.delete(taskId);
        }
      }

      let rateLimitDetected = false;
      for (const { taskId, result } of settled) {
        running.delete(taskId);
        const task = taskMap.get(taskId)!;

        if (result.success) {
          completed.add(taskId);
          task.status = 'completed';
          task.result = result;
          results.push(result);
          onLog?.('dispatch', 'info', `Task completed: ${task.title}`);
        } else {
          const currentRetries = retryCount.get(taskId) || 0;
          const isAbort = result.error?.includes('Aborted by user');
          const isRateLimit = result.error && /rate.?limit|429|too many requests|quota.?exceeded/i.test(result.error);

          if (currentRetries < maxRetries && result.error && !isAbort) {
            retryCount.set(taskId, currentRetries + 1);
            retryErrors.set(taskId, result.error);
            pending.add(taskId);
            task.status = 'pending';
            onLog?.('dispatch', 'info', `Retrying ${task.title} (${currentRetries + 1}/${maxRetries})`);
            if (isRateLimit) rateLimitDetected = true;
            continue;
          }

          failed.add(taskId);
          task.status = 'failed';
          task.result = result;
          results.push(result);
          onLog?.('dispatch', 'failed', `Task failed: ${task.title}: ${result.error}`);
          if (isRateLimit) rateLimitDetected = true;
        }
      }
      emitUpdate();

      if (rateLimitDetected) {
        onLog?.('dispatch', 'info', 'Rate limit detected, backing off 60s');
        await new Promise(r => setTimeout(r, 60000));
      }
    }
  } finally {
    // Ensure all worktrees are cleaned up on exit (abort, crash, or normal completion)
    if (worktreeMode) {
      const cleanup = cleanupRunWorktrees(projectPath, runId);
      if (cleanup.cleaned > 0) {
        onLog?.('dispatch', 'info', `Cleaned up ${cleanup.cleaned} worktree(s)`);
      }
    }
  }

  return { results, tasks };
}

// ============================================================================
// Dependency-Aware Scheduler
// ============================================================================

function getNextBatch(
  allTasks: V3Task[],
  pending: Set<string>,
  running: Map<string, Set<string>>,
  completed: Set<string>,
  _failed: Set<string>,
  maxParallel: number,
  skipOverlapCheck: boolean = false
): V3Task[] {
  const available = maxParallel - running.size;
  if (available <= 0) return [];

  const runningPaths = new Set<string>();
  if (!skipOverlapCheck) {
    for (const paths of running.values()) {
      for (const p of paths) runningPaths.add(p);
    }
  }

  const batch: V3Task[] = [];
  const batchPaths = new Set<string>();

  for (const task of allTasks) {
    if (!pending.has(task.id)) continue;
    if (batch.length >= available) break;

    // Check dependencies are all completed
    const depsReady = task.dependsOn.every(dep => completed.has(dep));
    if (!depsReady) continue;

    // Check file overlap with running tasks (skipped in worktree mode)
    if (!skipOverlapCheck) {
      const taskPaths = new Set(task.targetFiles.map(f => f.replace(/\\/g, '/')));
      if (hasOverlap(taskPaths, runningPaths)) continue;
      if (hasOverlap(taskPaths, batchPaths)) continue;
      for (const p of taskPaths) batchPaths.add(p);
    }

    batch.push(task);
  }

  return batch;
}

// ============================================================================
// Single Task Dispatch
// ============================================================================

interface DispatchContext {
  projectId: string;
  projectPath: string;
  projectName: string;
  runId: string;
  goalContext: { title: string; description: string };
  healingContext: string;
  errorContext?: string;
  config: import('../types').BalancingConfig;
  v3Config: V3Config;
  autoCommit: boolean;
  abortSignal?: AbortSignal;
}

async function dispatchTask(task: V3Task, ctx: DispatchContext): Promise<V3TaskResult> {
  const startTime = Date.now();

  // 1. Route model by complexity
  const effortMap = { 1: 2, 2: 5, 3: 8 } as const;
  const routing = routeModel(
    { effort: effortMap[task.complexity] },
    ctx.config
  );

  // 2. Compose prompt (no LLM — direct template)
  let prompt = composeTaskPrompt(task, ctx);
  if (ctx.errorContext) {
    prompt = `PREVIOUS ATTEMPT FAILED\nThe previous attempt to implement this task failed with:\n${ctx.errorContext}\nPlease fix the issues and try again.\n---\n${prompt}`;
  }

  // 3. Snapshot files before dispatch
  const beforeSnapshots = snapshotFiles(ctx.projectPath, task.targetFiles);

  // 4. Dispatch to CLI
  const providerConfig: CLIProviderConfig = {
    provider: routing.provider as CLIProvider,
    model: routing.model,
  };

  const executionId = startExecution(
    ctx.projectPath,
    prompt,
    undefined,
    undefined,
    providerConfig,
    { VIBEMAN_PROJECT_ID: ctx.projectId, VIBEMAN_TASK_ID: task.id }
  );

  // 5. Poll for completion
  const timeoutMs = ctx.v3Config.executionTimeoutMs || 6000 * 1000;
  const deadline = Date.now() + timeoutMs;

  while (true) {
    if (ctx.abortSignal?.aborted) {
      abortExecution(executionId);
      return {
        success: false, error: 'Aborted by user',
        filesChanged: [], durationMs: Date.now() - startTime,
        provider: routing.provider, model: routing.model,
      };
    }

    const execution = getExecution(executionId);
    if (!execution) {
      return {
        success: false, error: 'Execution not found',
        filesChanged: [], durationMs: Date.now() - startTime,
        provider: routing.provider, model: routing.model,
      };
    }

    if (execution.status === 'completed' || execution.status === 'error') {
      // 6. Verify file changes
      const snapshotLookup = new Set(beforeSnapshots.filter(s => s.exists).map(s => s.path));
      const verification = verifyExecution(ctx.projectPath, {
        create: task.targetFiles.filter(f => !snapshotLookup.has(f.replace(/\\/g, '/'))),
        modify: task.targetFiles.filter(f => snapshotLookup.has(f.replace(/\\/g, '/'))),
        delete: [],
      }, beforeSnapshots);

      const filesChanged = task.targetFiles;
      const success = execution.status === 'completed' && verification.passed;

      // 7. Per-task commit
      let commitSha: string | undefined;
      if (success && ctx.autoCommit && filesChanged.length > 0) {
        const commitResult = commitPerTask(ctx.projectPath, task.title, filesChanged);
        if (commitResult) commitSha = commitResult.sha;
      }

      return {
        success,
        error: success ? undefined : (execution.status === 'error' ? 'Execution error' : 'File verification failed'),
        filesChanged,
        durationMs: Date.now() - startTime,
        provider: routing.provider,
        model: routing.model,
        commitSha,
      };
    }

    if (Date.now() > deadline) {
      abortExecution(executionId);
      return {
        success: false, error: `Timeout after ${Math.round(timeoutMs / 1000)}s`,
        filesChanged: [], durationMs: Date.now() - startTime,
        provider: routing.provider, model: routing.model,
      };
    }

    await new Promise(r => setTimeout(r, 5000));
  }
}

// ============================================================================
// Prompt Composer (zero LLM — direct template)
// ============================================================================

function getKBContextForTask(task: V3Task, ctx: DispatchContext): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { knowledgeBaseService } = require('@/lib/knowledge-base/knowledgeBaseService');
    const entries = knowledgeBaseService.getRelevantForTask({
      taskTitle: task.title,
      taskDescription: task.description,
      targetFiles: task.targetFiles,
      projectId: ctx.projectId,
      limit: 5,
    });
    if (entries.length === 0) return '';
    return knowledgeBaseService.formatKBForPrompt(entries);
  } catch (err) {
    console.warn('[v3:dispatch] KB context retrieval failed:', err);
    return '';
  }
}

function composeTaskPrompt(task: V3Task, ctx: DispatchContext): string {
  const targetFilesSection = task.targetFiles.length > 0
    ? `\n## Target Files\n\n${task.targetFiles.map(f => `- \`${f}\``).join('\n')}`
    : '';

  const healingSection = ctx.healingContext
    ? `\n## Previous Errors to Avoid\n\n${ctx.healingContext}`
    : '';

  const kbSection = getKBContextForTask(task, ctx);

  return `You are an expert software engineer. Execute the following task precisely.

## Goal Context

**${ctx.goalContext.title}**

${ctx.goalContext.description}

## Task: ${task.title}

${task.description}
${targetFilesSection}
${healingSection}
${kbSection ? `\n${kbSection}\n` : ''}
## Instructions

1. Read and understand the relevant source files before making changes
2. Implement the task as described — be precise and thorough
3. Only modify files listed in Target Files (create new files if needed)
4. Follow existing code patterns, naming conventions, and architecture
5. Add proper TypeScript types — no \`any\` unless absolutely necessary
6. Include error handling for edge cases
7. After implementation, verify your changes compile: run \`npx tsc --noEmit\`
8. Stage and commit your changes with a descriptive message

## Quality Checklist

- [ ] Changes match the task description exactly
- [ ] TypeScript compiles without new errors
- [ ] No console.log debugging left behind
- [ ] Error handling is present where needed
- [ ] File paths and imports are correct`;
}
