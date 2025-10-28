/**
 * Task execution logic for batch requirement processing
 */

import { executeRequirementAsync, getTaskStatus, deleteRequirement } from '@/app/Claude/lib/requirementApi';
import type { ProjectRequirement, TaskRunnerActions } from './types';

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
    console.warn('[TaskRunner] API health check failed:', error);
    return false;
  }
}

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

  if (executionQueueRef.current.length === 0 || isExecutingRef.current || isPaused) return;

  isExecutingRef.current = true;
  const reqId = executionQueueRef.current[0];
  const req = requirements.find((r) => getRequirementId(r) === reqId);

  if (!req) {
    executionQueueRef.current.shift();
    isExecutingRef.current = false;
    return;
  }

  console.log(`[TaskRunner] Executing: ${req.requirementName} (${req.projectName})`);

  // Update status to running
  setRequirements((prev) =>
    prev.map((r) =>
      getRequirementId(r) === reqId
        ? { ...r, status: 'running' as const }
        : r
    )
  );

  // Remove from queue
  executionQueueRef.current.shift();
  setProcessedCount((prev) => prev + 1);

  try {
    // Health check before creating task - wait for API to be ready
    console.log('[TaskRunner] Performing health check before task creation...');
    let apiReady = await checkApiHealth();
    let healthCheckAttempts = 0;
    const MAX_HEALTH_CHECKS = 5;

    while (!apiReady && healthCheckAttempts < MAX_HEALTH_CHECKS) {
      healthCheckAttempts++;
      console.warn(`[TaskRunner] API not ready, waiting... (attempt ${healthCheckAttempts}/${MAX_HEALTH_CHECKS})`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between checks
      apiReady = await checkApiHealth();
    }

    if (!apiReady) {
      throw new Error('API failed to become ready after health checks');
    }

    console.log('[TaskRunner] API health check passed, creating task...');

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
        console.log(`[TaskRunner] Task created successfully: ${taskId}`);
        break; // Success, exit retry loop
      } catch (creationError) {
        retryCount++;
        const errorMsg = creationError instanceof Error ? creationError.message : String(creationError);

        // Check if it's a transient error (Next.js build error)
        const isTransient = errorMsg.includes('temporary Next.js build error') ||
                            errorMsg.includes('invalid response format') ||
                            errorMsg.includes('Server returned non-JSON response');

        if (isTransient && retryCount <= MAX_CREATION_RETRIES) {
          console.warn(`[TaskRunner] Transient error creating task (attempt ${retryCount}/${MAX_CREATION_RETRIES}):`, errorMsg);
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
    console.log('[TaskRunner] Waiting 5 seconds before starting status polling...');
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
          console.log('[TaskRunner] Speeding up polling interval to 2 seconds');
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
            // Delete requirement file after successful completion
            try {
              await deleteRequirement(req.projectPath, req.requirementName);

              // Remove from requirements list
              setRequirements((prev) => prev.filter((r) => getRequirementId(r) !== reqId));

              // CRITICAL: Remove from selected requirements
              setSelectedRequirements((prev) => {
                const newSet = new Set(prev);
                newSet.delete(reqId);
                return newSet;
              });

              console.log(`[TaskRunner] Successfully completed and deleted: ${req.requirementName}`);

              // CRITICAL: Wait 5 seconds after file deletion to give Next.js time to rebuild
              console.log('[TaskRunner] Waiting 5 seconds for Next.js to rebuild after file deletion...');
              await new Promise(resolve => setTimeout(resolve, 5000));
              console.log('[TaskRunner] Ready to process next task');
            } catch (deleteError) {
              console.error('Failed to delete completed requirement:', deleteError);
              setError(`Failed to delete completed requirement: ${req.requirementName}`);
            } finally {
              // Mark as not executing
              isExecutingRef.current = false;

              // CRITICAL: Explicitly trigger next task execution if queue has more items
              if (executionQueueRef.current.length > 0 && !isPaused) {
                console.log(`[TaskRunner] Queue has ${executionQueueRef.current.length} more items, triggering next execution...`);
                // Use setTimeout to break out of this async context
                setTimeout(() => {
                  recursiveExecute();
                }, 100);
              }
            }
          } else if (task.status === 'failed') {
            isExecutingRef.current = false;

            // Continue with next task if queue has more items
            if (executionQueueRef.current.length > 0 && !isPaused) {
              console.log(`[TaskRunner] Task failed but queue has more items, continuing...`);
              setTimeout(() => {
                recursiveExecute();
              }, 2000); // Wait a bit before next task after failure
            }
            const errorMessage = task.error || 'Unknown error';
            const logInfo = task.logFilePath ? ` Check log: ${task.logFilePath}` : '';
            console.error(`[TaskRunner] Task failed:`, {
              requirementName: req.requirementName,
              error: errorMessage,
              logFilePath: task.logFilePath,
              progress: task.progress,
            });
            setError(`Task failed: ${req.requirementName}\nError: ${errorMessage}${logInfo}`);
          } else if (task.status === 'session-limit') {
            isExecutingRef.current = false;
            const errorMessage = task.error || 'Session limit reached';
            console.log('[TaskRunner] Session limit reached, clearing queue');
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
        console.error(`Error polling task status (attempt ${pollErrorCount}/${MAX_POLL_ERRORS}):`, pollErr);

        // Slow down polling on errors
        if (currentPollInterval < 5000) {
          console.log('[TaskRunner] Slowing down polling due to errors');
          currentPollInterval = 5000;
          clearInterval(pollIntervalId);
          pollIntervalId = setInterval(pollStatus, currentPollInterval);
        }

        // If too many consecutive errors, stop polling and mark as failed
        if (pollErrorCount >= MAX_POLL_ERRORS) {
          console.error(`[TaskRunner] Too many polling errors, stopping task: ${req.requirementName}`);
          clearInterval(pollIntervalId);
          isExecutingRef.current = false;

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
            console.log(`[TaskRunner] Polling failed but queue has more items, continuing...`);
            setTimeout(() => {
              recursiveExecute();
            }, 3000); // Wait a bit longer after polling failure
          }
        }
        // Otherwise, continue polling (transient errors)
      }
    };

    // Start polling with initial slow interval
    pollIntervalId = setInterval(pollStatus, currentPollInterval);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[TaskRunner] Failed to execute ${req.requirementName}:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    isExecutingRef.current = false;
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
      console.log(`[TaskRunner] Task creation failed but queue has more items, continuing...`);
      setTimeout(() => {
        recursiveExecute();
      }, 3000); // Wait a bit before next task after creation failure
    }
  }
}
