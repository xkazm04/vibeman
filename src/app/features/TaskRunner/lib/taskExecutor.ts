/**
 * Task execution logic for batch requirement processing
 */

import { executeRequirementAsync, getTaskStatus, deleteRequirement } from '@/app/Claude/lib/requirementApi';
import type { ProjectRequirement, TaskRunnerActions } from './types';
import { executeGitOperations, generateCommitMessage } from '../sub_Git/gitApi';
import type { GitConfig } from '../sub_Git/useGitConfig';
import { getContextIdFromRequirement, triggerScreenshotCapture } from '../sub_Screenshot/screenshotApi';
import { BatchStorage } from './batchStorage';

/**
 * Check if the API is healthy and ready to accept requests
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/claude-code?projectPath=/&action=status', {
      method: 'GET',
    });
    const contentType = response.headers.get('content-type');
    return contentType?.includes('application/json') || false;
  } catch (error) {
    return false;
  }
}

/**
 * Update batch progress in localStorage after a task completes
 */
export function updateBatchProgress(reqId: string): void {
  if (typeof window === 'undefined') return;

  const currentState = BatchStorage.load();
  if (!currentState) return;

  // Check all batches and update the one that contains this requirement
  const batchIds: Array<'batch1' | 'batch2' | 'batch3' | 'batch4'> = ['batch1', 'batch2', 'batch3', 'batch4'];
  const updatedState = { ...currentState };

  for (const batchId of batchIds) {
    const batch = currentState[batchId];
    if (batch && batch.requirementIds.includes(reqId)) {
      updatedState[batchId] = {
        ...batch,
        completedCount: batch.completedCount + 1,
      };

      // Check if batch is complete
      if (updatedState[batchId]!.completedCount >= batch.requirementIds.length) {
        updatedState[batchId]!.status = 'completed';
      }
    }
  }

  // Save updated state
  BatchStorage.save(updatedState);
}

/**
 * Track which requirements are currently being executed
 * This allows parallel execution of multiple batches
 */
const executingRequirements = new Set<string>();

/**
 * Helper: Clean up after task execution and trigger next tasks
 */
function cleanupAndContinue(reqId: string, recursiveExecute: () => void, executionQueueRef: React.MutableRefObject<string[]>, delayMs: number = 100): void {
  executingRequirements.delete(reqId);

  if (executionQueueRef.current.length > 0) {
    setTimeout(() => {
      recursiveExecute();
      // Try again to potentially start another batch
      setTimeout(() => recursiveExecute(), 50);
    }, delayMs);
  }
}

/**
 * Helper: Load git config from localStorage
 */
function loadGitConfig(req: ProjectRequirement): { enabled: true; commands: string[]; commitMessage: string } | undefined {
  if (typeof window === 'undefined') return undefined;

  const gitEnabled = localStorage.getItem('taskRunner_gitEnabled') === 'true';
  if (!gitEnabled) return undefined;

  try {
    const storedConfig = localStorage.getItem('taskRunner_gitConfig');
    if (!storedConfig) return undefined;

    const parsedConfig = JSON.parse(storedConfig);
    return {
      enabled: true,
      commands: parsedConfig.commands || ['git add .', 'git commit -m "{commitMessage}"', 'git push'],
      commitMessage: parsedConfig.commitMessageTemplate?.replace('{requirementName}', req.requirementName) || `Auto-commit: ${req.requirementName}`
    };
  } catch (err) {
    // Failed to parse git config from localStorage
    return undefined;
  }
}

/**
 * Configuration for task execution
 */
export interface TaskExecutorConfig {
  executionQueueRef: React.MutableRefObject<string[]>;
  isExecutingRef: React.MutableRefObject<boolean>;
  isPaused: boolean; // Global pause (kept for backwards compatibility)
  batchStates?: Map<string, 'idle' | 'running' | 'paused' | 'completed'>; // Per-batch pause states
  requirements: ProjectRequirement[];
  actions: TaskRunnerActions;
  getRequirementId: (req: ProjectRequirement) => string;
  executeNextRequirement: () => void;
}

/**
 * Execute the next requirement in the queue
 * Supports parallel execution of multiple batches
 */
export async function executeNextRequirement(config: TaskExecutorConfig): Promise<void> {
  const {
    executionQueueRef,
    isExecutingRef,
    isPaused,
    batchStates,
    requirements,
    actions,
    getRequirementId,
    executeNextRequirement: recursiveExecute,
  } = config;

  const { setRequirements, setSelectedRequirements, setProcessedCount, setError, setIsRunning } = actions;

  if (executionQueueRef.current.length === 0) return;

  // Find which batches are currently executing
  const runningBatchIds = new Set<string>();
  requirements.forEach(req => {
    if (req.status === 'running' && req.batchId) {
      runningBatchIds.add(req.batchId);
    }
  });

  // Find next requirement that:
  // 1. Isn't already executing
  // 2. Batch isn't paused
  // 3. Batch doesn't have another requirement running (one requirement per batch at a time)
  let reqId: string | null = null;
  let reqIndex = -1;

  for (let i = 0; i < executionQueueRef.current.length; i++) {
    const candidateId = executionQueueRef.current[i];

    // Skip if already executing
    if (executingRequirements.has(candidateId)) continue;

    const candidateReq = requirements.find((r) => getRequirementId(r) === candidateId);
    if (!candidateReq) continue;

    // Check if this requirement's batch is paused
    if (candidateReq.batchId && batchStates) {
      const batchStatus = batchStates.get(candidateReq.batchId);
      if (batchStatus === 'paused') {
        // Skip this requirement - its batch is paused
        continue;
      }

      // Skip if this batch already has a requirement running
      if (runningBatchIds.has(candidateReq.batchId)) {
        continue;
      }
    }

    // Found a valid requirement to execute
    reqId = candidateId;
    reqIndex = i;
    break;
  }

  // All queued requirements are either executing, paused, or their batch is busy
  if (!reqId || reqIndex === -1) return;

  const req = requirements.find((r) => getRequirementId(r) === reqId);

  if (!req) {
    executionQueueRef.current.splice(reqIndex, 1);
    return;
  }

  // Mark this requirement as executing (allows other batches to run in parallel)
  executingRequirements.add(reqId);

  // Update status to running
  setRequirements((prev) =>
    prev.map((r) =>
      getRequirementId(r) === reqId
        ? { ...r, status: 'running' as const }
        : r
    )
  );

  // Remove from queue
  executionQueueRef.current.splice(reqIndex, 1);
  setProcessedCount((prev) => prev + 1);

  try {
    // Health check before creating task - wait for API to be ready
    let apiReady = await checkApiHealth();
    let healthCheckAttempts = 0;
    const MAX_HEALTH_CHECKS = 5;

    while (!apiReady && healthCheckAttempts < MAX_HEALTH_CHECKS) {
      healthCheckAttempts++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between checks
      apiReady = await checkApiHealth();
    }

    if (!apiReady) {
      throw new Error('API failed to become ready after health checks');
    }

    // Get git configuration from localStorage
    const gitConfig = loadGitConfig(req);

    // Start async execution with retry logic for transient errors
    let taskId: string;
    let retryCount = 0;
    const MAX_CREATION_RETRIES = 5;

    while (retryCount <= MAX_CREATION_RETRIES) {
      try {
        const result = await executeRequirementAsync(
          req.projectPath,
          req.requirementName,
          req.projectId,
          gitConfig
        );
        taskId = result.taskId;
        break; // Success, exit retry loop
      } catch (creationError) {
        retryCount++;
        const errorMsg = creationError instanceof Error ? creationError.message : String(creationError);

        // Check if it's a transient error (Next.js build error)
        const isTransient = errorMsg.includes('temporary Next.js build error') ||
                            errorMsg.includes('invalid response format') ||
                            errorMsg.includes('Server returned non-JSON response');

        if (isTransient && retryCount <= MAX_CREATION_RETRIES) {
          // Wait with exponential backoff: 2s, 4s, 6s, 8s, 10s
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        } else {
          // Non-transient error or out of retries
          throw creationError;
        }
      }
    }

    // Store task ID (should be the requirement name)
    setRequirements((prev) =>
      prev.map((r) =>
        getRequirementId(r) === reqId ? { ...r, taskId: taskId! } : r
      )
    );

    // Poll for status using the requirement name as task ID
    let pollErrorCount = 0;
    const MAX_POLL_ERRORS = 15;
    const POLL_INTERVAL = 10000; // Poll every 10 seconds

    // Wait before starting to poll to give Next.js time to settle
    await new Promise(resolve => setTimeout(resolve, 10000));

    let pollIntervalId: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const task = await getTaskStatus(req.requirementName);

        // Reset error count on successful poll
        pollErrorCount = 0;

        setRequirements((prev) =>
          prev.map((r) =>
            getRequirementId(r) === reqId
              ? { ...r, status: task.status }
              : r
          )
        );

        // Stop polling if completed
        if (
          task.status === 'completed' ||
          task.status === 'failed' ||
          task.status === 'session-limit'
        ) {
          clearInterval(pollIntervalId);

          // Handle completion
          if (task.status === 'completed') {
            // Note: Git operations are now handled by Claude Code in the prompt
            // The executeGitWorkflow function below is deprecated and kept for backward compatibility
            // If git is enabled, Claude Code will execute git commands as part of the requirement execution

            // Trigger screenshot capture if enabled (fire-and-forget, non-blocking)
            const screenshotEnabled = typeof window !== 'undefined' && localStorage.getItem('taskRunner_screenshotEnabled') === 'true';
            if (screenshotEnabled) {
              // Get context_id from the idea associated with this requirement
              getContextIdFromRequirement(req.requirementName).then(contextId => {
                if (contextId) {
                  triggerScreenshotCapture(contextId);
                }
              }).catch(() => {
                // Screenshot trigger error (non-blocking)
              });
            }

            // Update idea status to 'implemented' if this requirement came from an idea
            await updateIdeaStatus(req.requirementName);

            // Delete requirement file after successful completion
            try {
              await deleteRequirement(req.projectPath, req.requirementName);
              updateBatchProgress(reqId);

              // Remove from requirements list and selected requirements
              setRequirements((prev) => prev.filter((r) => getRequirementId(r) !== reqId));
              setSelectedRequirements((prev) => {
                const newSet = new Set(prev);
                newSet.delete(reqId);
                return newSet;
              });

              // Wait for Next.js to rebuild after file deletion
              await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (deleteError) {
              setError(`Failed to delete completed requirement: ${req.requirementName}`);
            } finally {
              // Remove from executing set and trigger next tasks
              cleanupAndContinue(reqId, recursiveExecute, executionQueueRef);
            }
          } else if (task.status === 'failed') {
            // Remove from executing set and continue
            cleanupAndContinue(reqId, recursiveExecute, executionQueueRef, 2000);

            const errorMessage = task.error || 'Unknown error';
            const logInfo = task.logFilePath ? ` Check log: ${task.logFilePath}` : '';
            setError(`Task failed: ${req.requirementName}\nError: ${errorMessage}${logInfo}`);
          } else if (task.status === 'session-limit') {
            // Remove from executing set
            executingRequirements.delete(reqId);
            const errorMessage = task.error || 'Session limit reached';
            setError(`Session limit reached: ${errorMessage}\nPlease try again later.`);
            executionQueueRef.current = [];
            setIsRunning(false);
            setRequirements((prev) =>
              prev.map((r) =>
                r.status === 'queued' ? { ...r, status: 'idle' as const } : r
              )
            );
          }
        }
      } catch (pollErr) {
        pollErrorCount++;

        // If too many consecutive errors, stop polling and mark as failed
        if (pollErrorCount >= MAX_POLL_ERRORS) {
          clearInterval(pollIntervalId);

          setRequirements((prev) =>
            prev.map((r) =>
              getRequirementId(r) === reqId
                ? { ...r, status: 'failed' as const }
                : r
            )
          );

          setError(`Task monitoring failed after ${MAX_POLL_ERRORS} attempts: ${req.requirementName}\nLast error: ${pollErr instanceof Error ? pollErr.message : 'Unknown error'}`);

          // Remove from executing set and continue
          cleanupAndContinue(reqId, recursiveExecute, executionQueueRef, 3000);
        }
      }
    };

    // Start polling with 10-second interval
    pollIntervalId = setInterval(pollStatus, POLL_INTERVAL);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    setError(`Failed to execute: ${req.requirementName}\nError: ${errorMessage}`);

    setRequirements((prev) =>
      prev.map((r) =>
        getRequirementId(r) === reqId
          ? { ...r, status: 'failed' as const }
          : r
      )
    );

    // Remove from executing set and continue
    cleanupAndContinue(reqId, recursiveExecute, executionQueueRef, 3000);
  }
}

/**
 * Execute git workflow for a completed task
 */
async function executeGitWorkflow(
  req: ProjectRequirement,
  setError: (error: string) => void
): Promise<void> {
  try {
    const gitConfigStr = typeof window !== 'undefined' ? localStorage.getItem('taskRunner_gitConfig') : null;
    if (!gitConfigStr) return;

    const gitConfig: GitConfig = JSON.parse(gitConfigStr);
    if (!gitConfig.commands.length) return;

    const commitMessage = generateCommitMessage(
      gitConfig.commitMessageTemplate,
      req.requirementName,
      req.projectName
    );

    const gitResult = await executeGitOperations(
      req.projectId,
      gitConfig.commands,
      commitMessage
    );

    if (!gitResult.success) {
      setError(`Git operations failed: ${gitResult.message}`);
    }
  } catch (gitError) {
    setError(`Git operations error: ${gitError instanceof Error ? gitError.message : 'Unknown error'}`);
  }
}

/**
 * Update idea status to implemented
 */
async function updateIdeaStatus(requirementName: string): Promise<void> {
  try {
    const response = await fetch(`/api/ideas/update-implementation-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementName }),
    });
    // Silently ignore errors - this is non-critical
  } catch (error) {
    // Silently ignore errors
  }
}
