/**
 * Task execution logic for batch requirement processing
 */

import { executeRequirementAsync, getTaskStatus, deleteRequirement } from '@/app/Claude/lib/requirementApi';
import type { ProjectRequirement, TaskRunnerActions } from './types';
import { executeGitOperations, generateCommitMessage } from '../sub_Git/gitApi';
import type { GitConfig } from '../sub_Git/useGitConfig';
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
 * Configuration for task execution
 */
export interface TaskExecutorConfig {
  executionQueueRef: React.MutableRefObject<string[]>;
  isExecutingRef: React.MutableRefObject<boolean>;
  isPaused: boolean;
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
    requirements,
    actions,
    getRequirementId,
    executeNextRequirement: recursiveExecute,
  } = config;

  const { setRequirements, setSelectedRequirements, setProcessedCount, setError, setIsRunning } = actions;

  if (executionQueueRef.current.length === 0 || isPaused) return;

  // Find next requirement that isn't already executing
  let reqId: string | null = null;
  let reqIndex = -1;

  for (let i = 0; i < executionQueueRef.current.length; i++) {
    const candidateId = executionQueueRef.current[i];
    if (!executingRequirements.has(candidateId)) {
      reqId = candidateId;
      reqIndex = i;
      break;
    }
  }

  // All queued requirements are already executing
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

    // Start async execution with retry logic for transient errors
    let taskId: string;
    let retryCount = 0;
    const MAX_CREATION_RETRIES = 5;

    while (retryCount <= MAX_CREATION_RETRIES) {
      try {
        const result = await executeRequirementAsync(
          req.projectPath,
          req.requirementName,
          req.projectId
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
    let consecutiveSuccesses = 0;
    let currentPollInterval = 5000; // Start with slow polling (5s)
    const FAST_POLL_INTERVAL = 2000; // Speed up to 2s after successes

    // Wait before starting to poll to give Next.js time to settle
    await new Promise(resolve => setTimeout(resolve, 5000));

    let pollIntervalId: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const task = await getTaskStatus(req.requirementName);

        // Reset error count on successful poll and track consecutive successes
        pollErrorCount = 0;
        consecutiveSuccesses++;

        // Adaptive polling: speed up after 3 successful polls
        if (consecutiveSuccesses >= 3 && currentPollInterval > FAST_POLL_INTERVAL) {
          currentPollInterval = FAST_POLL_INTERVAL;
          clearInterval(pollIntervalId);
          pollIntervalId = setInterval(pollStatus, currentPollInterval);
        }

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
            // Check if git mode is enabled
            const gitEnabled = typeof window !== 'undefined' && localStorage.getItem('taskRunner_gitEnabled') === 'true';

            if (gitEnabled) {
              await executeGitWorkflow(req, setError);
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
              // Remove from executing set to allow other requirements to run
              executingRequirements.delete(reqId);

              // Trigger next task execution if queue has more items
              if (executionQueueRef.current.length > 0 && !isPaused) {
                setTimeout(() => recursiveExecute(), 100);
              }
            }
          } else if (task.status === 'failed') {
            // Remove from executing set
            executingRequirements.delete(reqId);

            // Continue with next task if queue has more items
            if (executionQueueRef.current.length > 0 && !isPaused) {
              setTimeout(() => recursiveExecute(), 2000);
            }

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

        // Slow down polling on errors
        if (currentPollInterval < 5000) {
          currentPollInterval = 5000;
          clearInterval(pollIntervalId);
          pollIntervalId = setInterval(pollStatus, currentPollInterval);
        }

        // If too many consecutive errors, stop polling and mark as failed
        if (pollErrorCount >= MAX_POLL_ERRORS) {
          clearInterval(pollIntervalId);

          // Remove from executing set
          executingRequirements.delete(reqId);

          setRequirements((prev) =>
            prev.map((r) =>
              getRequirementId(r) === reqId
                ? { ...r, status: 'failed' as const }
                : r
            )
          );

          setError(`Task monitoring failed after ${MAX_POLL_ERRORS} attempts: ${req.requirementName}\nLast error: ${pollErr instanceof Error ? pollErr.message : 'Unknown error'}`);

          // Continue with next task if queue has more items
          if (executionQueueRef.current.length > 0 && !isPaused) {
            setTimeout(() => recursiveExecute(), 3000);
          }
        }
      }
    };

    // Start polling with initial slow interval
    pollIntervalId = setInterval(pollStatus, currentPollInterval);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Remove from executing set
    executingRequirements.delete(reqId);

    setError(`Failed to execute: ${req.requirementName}\nError: ${errorMessage}`);

    setRequirements((prev) =>
      prev.map((r) =>
        getRequirementId(r) === reqId
          ? { ...r, status: 'failed' as const }
          : r
      )
    );

    // Continue with next task if queue has more items
    if (executionQueueRef.current.length > 0 && !isPaused) {
      setTimeout(() => recursiveExecute(), 3000);
    }
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
