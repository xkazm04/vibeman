/**
 * Task Execution Actions
 * Execute tasks, poll for completion, handle success/failure lifecycle
 */

import type { ProjectRequirement } from '../lib/types';
import type { TaskActivity, ActivityEvent } from '../lib/activityClassifier.types';
import type { TaskStatusUnion } from '../lib/types';
import type { BatchId, TaskRunnerState } from './taskRunnerStore';
import { rulesLoader } from '@/lib/rules';
import {
  createQueuedStatus,
  createRunningStatus,
  createCompletedStatus,
  createFailedStatus,
  isBatchRunning,
} from '../lib/types';
import { executeRequirementAsync, getTaskStatus, deleteRequirement } from '@/app/Claude/lib/requirementApi';
import { getContextIdFromRequirement } from '../sub_Screenshot/screenshotApi';
import {
  startSSEPolling,
  PollingResults,
  type PollingCallback,
  type PollingResult,
} from '../lib/pollingManager';
import { updateCheckpointStates, autoAdvanceCheckpoints } from '../lib/checkpointDetector';
import { remoteEvents } from '@/lib/remote';

type Set = (fn: ((state: TaskRunnerState) => Partial<TaskRunnerState> | TaskRunnerState) | Partial<TaskRunnerState>) => void;
type Get = () => TaskRunnerState;

/**
 * Get a reference to the store for use in external callbacks.
 * Must be set by the main store module after creation.
 */
let storeRef: {
  getState: Get;
  setState: Set;
} | null = null;

/** Called by the main store to link the execution actions to the store instance. */
export function setStoreRef(ref: { getState: Get; setState: Set }): void {
  storeRef = ref;
}

function getStore() {
  if (!storeRef) throw new Error('Store ref not initialized — call setStoreRef first');
  return storeRef;
}

export function createExecutionActions(set: Set, get: Get) {
  return {
    executeNextTask: async (batchId: BatchId, requirements: ProjectRequirement[]) => {
      const state = get();
      const batch = state.batches[batchId];

      if (!batch || !isBatchRunning(batch.status)) return;
      if (state.isPaused) return;
      if (!state.canStartTask(batchId)) return;

      const nextTask = state.getNextTaskForBatch(batchId);
      if (!nextTask) {
        const progress = state.getBatchProgress(batchId);
        if (progress.total === progress.completed + progress.failed) {
          state.completeBatch(batchId);
        }
        return;
      }

      const [taskProjectId, taskRequirementName] = nextTask.id.includes(':')
        ? nextTask.id.split(':')
        : [null, nextTask.id];

      console.log(`🔍 Looking for requirement - Task ID: ${nextTask.id}, Parsed: projectId=${taskProjectId}, name=${taskRequirementName}`);

      const requirement = requirements.find(r => {
        if (taskProjectId) {
          return r.projectId === taskProjectId && r.requirementName === taskRequirementName;
        } else {
          return r.requirementName === taskRequirementName;
        }
      });

      if (!requirement) {
        console.error(`❌ Requirement not found for task: ${nextTask.id}`);
        console.error(`Available requirements:`, requirements.map(r => `${r.projectId}:${r.requirementName}`));
        state.updateTaskStatus(nextTask.id, createFailedStatus('Requirement not found'));

        set((state) => ({
          executingTasks: new Set([...state.executingTasks].filter(id => id !== nextTask.id)),
        }));

        set((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;
          return {
            batches: {
              ...state.batches,
              [batchId]: { ...batch, failedCount: batch.failedCount + 1 },
            },
          };
        });

        setTimeout(() => {
          state.executeNextTask(batchId, requirements);
        }, 500);
        return;
      }

      console.log(`✅ Requirement found: ${requirement.projectPath}/.claude/commands/${requirement.requirementName}.md`);
      console.log(`🚀 Starting task execution for: ${nextTask.id}`);

      // Mark task as running
      set((state) => ({
        tasks: {
          ...state.tasks,
          [nextTask.id]: {
            ...state.tasks[nextTask.id],
            status: createRunningStatus(),
          },
        },
        executingTasks: new Set([...state.executingTasks, nextTask.id]),
      }));

      // Initialize checkpoints
      const contextId = await getContextIdFromRequirement(requirement.requirementName);

      // Post-await verification
      {
        const freshState = get();
        const freshBatch = freshState.batches[batchId];
        if (!freshBatch || !isBatchRunning(freshBatch.status) || freshState.isPaused) {
          console.log(`⚠️ Batch ${batchId} state changed during context lookup, aborting task ${nextTask.id}`);
          set((s) => ({
            executingTasks: new Set([...s.executingTasks].filter(id => id !== nextTask.id)),
            tasks: {
              ...s.tasks,
              [nextTask.id]: {
                ...s.tasks[nextTask.id],
                status: createQueuedStatus(),
              },
            },
          }));
          return;
        }
        if (!freshBatch.taskIds.includes(nextTask.id)) {
          console.log(`⚠️ Task ${nextTask.id} no longer in batch ${batchId}, aborting execution`);
          set((s) => ({
            executingTasks: new Set([...s.executingTasks].filter(id => id !== nextTask.id)),
          }));
          return;
        }
      }

      const builtRules = rulesLoader.buildRules({
        requirementContent: '',
        projectPath: requirement.projectPath,
        projectId: requirement.projectId,
        contextId: contextId || undefined,
        gitEnabled: state.gitConfig?.enabled || false,
        gitCommitMessage: state.gitConfig?.commitMessage,
      });
      state.initializeCheckpoints(nextTask.id, builtRules);
      console.log(`📋 Initialized ${builtRules.includedRuleIds.length} checkpoints for task: ${nextTask.id}`);

      // Publish task started event to remote
      remoteEvents.taskStarted(requirement.projectId, {
        taskId: nextTask.id,
        batchId,
        title: requirement.requirementName,
      });

      try {
        const result = await executeRequirementAsync(
          requirement.projectPath,
          requirement.requirementName,
          requirement.projectId,
          state.gitConfig || undefined
        );

        // Post-await verification after executeRequirementAsync
        {
          const freshState = get();
          const freshBatch = freshState.batches[batchId];
          if (!freshBatch || !isBatchRunning(freshBatch.status) || freshState.isPaused) {
            console.log(`⚠️ Batch ${batchId} state changed during execution startup, task ${nextTask.id} will be orphaned`);
            set((s) => ({
              executingTasks: new Set([...s.executingTasks].filter(id => id !== nextTask.id)),
            }));
            return;
          }
          if (!freshBatch.taskIds.includes(nextTask.id)) {
            console.log(`⚠️ Task ${nextTask.id} removed from batch ${batchId} during execution startup`);
            set((s) => ({
              executingTasks: new Set([...s.executingTasks].filter(id => id !== nextTask.id)),
            }));
            return;
          }
        }

        // Start polling for completion
        startTaskPolling(result.taskId, nextTask.id, batchId, requirement);

      } catch (error) {
        console.error(`Error executing task ${nextTask.id}:`, error);
        state.updateTaskStatus(nextTask.id, createFailedStatus(error instanceof Error ? error.message : 'Unknown error'));

        set((state) => ({
          executingTasks: new Set([...state.executingTasks].filter(id => id !== nextTask.id)),
        }));

        set((state) => {
          const batch = state.batches[batchId];
          if (!batch) return state;
          return {
            batches: {
              ...state.batches,
              [batchId]: { ...batch, failedCount: batch.failedCount + 1 },
            },
          };
        });

        setTimeout(() => state.executeNextTask(batchId, requirements), 1000);
      }
    },

    updateTaskStatus: (taskId: string, status: TaskStatusUnion) => {
      set((state) => ({
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...state.tasks[taskId],
            status,
          },
        },
      }));
    },

    updateTaskProgress: (taskId: string, progressLines: number) => {
      set((state) => ({
        taskProgress: {
          ...state.taskProgress,
          [taskId]: progressLines,
        },
      }));
    },

    updateTaskActivity: (taskId: string, activity: TaskActivity) => {
      set((state) => ({
        taskActivity: {
          ...state.taskActivity,
          [taskId]: activity,
        },
      }));
    },
  };
}

// ============================================================================
// Polling helpers (module-level, access store via storeRef)
// ============================================================================

/**
 * Check whether the batch is still valid and active.
 * Returns false if the batch was cleared, completed, or task removed,
 * meaning the polling callback should stop to avoid stale state corruption.
 */
function isBatchStillActive(batchId: BatchId, requirementId: string): boolean {
  const store = getStore();
  const state = store.getState();
  const batch = state.batches[batchId];

  if (!batch) {
    console.log(`⚠️ Batch ${batchId} no longer exists, stopping poll for ${requirementId}`);
    return false;
  }

  if (!isBatchRunning(batch.status)) {
    console.log(`⚠️ Batch ${batchId} no longer running (${batch.status}), stopping poll for ${requirementId}`);
    return false;
  }

  if (!batch.taskIds.includes(requirementId)) {
    console.log(`⚠️ Task ${requirementId} removed from batch ${batchId}, stopping poll`);
    return false;
  }

  return true;
}

/**
 * Clean up executing-task tracking and ephemeral state for an abandoned task.
 */
function cleanupAbandonedTask(requirementId: string): void {
  const store = getStore();
  store.setState((state: TaskRunnerState) => {
    const newProgress = { ...state.taskProgress };
    delete newProgress[requirementId];
    const newActivity = { ...state.taskActivity };
    delete newActivity[requirementId];
    const newCheckpoints = { ...state.taskCheckpoints };
    delete newCheckpoints[requirementId];
    return {
      executingTasks: new Set([...state.executingTasks].filter(id => id !== requirementId)),
      taskProgress: newProgress,
      taskActivity: newActivity,
      taskCheckpoints: newCheckpoints,
    };
  });
}

/**
 * Create a polling callback for a task.
 *
 * Reads fresh state from storeRef on every poll tick to prevent stale-closure bugs.
 * Stops polling immediately if the batch was cleared, paused, or completed
 * during an async gap (e.g. while getTaskStatus was in-flight).
 */
export function createPollingCallback(
  taskId: string,
  requirementId: string,
  batchId: BatchId,
  requirement: ProjectRequirement
): PollingCallback {
  return async (): Promise<PollingResult> => {
    try {
      // ── Pre-flight: bail out if batch was cleared/stopped ──
      if (!isBatchStillActive(batchId, requirementId)) {
        cleanupAbandonedTask(requirementId);
        return PollingResults.success(); // stops the poller
      }

      const taskStatus = await getTaskStatus(taskId);

      if (!taskStatus) {
        console.log(`⏳ Task ${taskId} not found yet, will retry...`);
        return PollingResults.continue();
      }

      if (taskStatus.status === 'pending') {
        console.warn(`⚠️ Task ${requirementId} still pending - execution may have failed to start`);
        return PollingResults.continue();
      }

      // ── Post-await: re-check after async gap (network call) ──
      if (!isBatchStillActive(batchId, requirementId)) {
        cleanupAbandonedTask(requirementId);
        return PollingResults.success();
      }

      // Batch progress/activity/checkpoint updates
      const progressLines = taskStatus.progress?.length || 0;
      let mappedActivity: TaskActivity | null = null;

      if (taskStatus.activity) {
        const parseEvent = (event: any): ActivityEvent | null => {
          if (!event) return null;
          return {
            ...event,
            timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
          };
        };

        mappedActivity = {
          currentActivity: parseEvent(taskStatus.activity.current),
          activityHistory: (taskStatus.activity.history || []).map(parseEvent).filter(Boolean) as ActivityEvent[],
          toolCounts: taskStatus.activity.toolCounts || {},
          phase: taskStatus.activity.phase || 'idle',
        };
      }

      if (progressLines > 0 || mappedActivity) {
        const store = getStore();
        store.setState((state: TaskRunnerState) => {
          // Guard: skip if batch disappeared between check and setState
          if (!state.batches[batchId]) return state;

          const updates: Partial<TaskRunnerState> = {};

          if (progressLines > 0) {
            updates.taskProgress = {
              ...state.taskProgress,
              [requirementId]: progressLines,
            };
          }

          if (mappedActivity) {
            updates.taskActivity = {
              ...state.taskActivity,
              [requirementId]: mappedActivity,
            };

            const checkpointState = state.taskCheckpoints[requirementId];
            if (checkpointState) {
              let updatedCheckpoints = updateCheckpointStates(
                checkpointState.checkpoints,
                mappedActivity,
                mappedActivity.activityHistory
              );
              updatedCheckpoints = autoAdvanceCheckpoints(updatedCheckpoints);
              const currentCheckpoint = updatedCheckpoints.find(
                (c) => c.status === 'in_progress'
              );
              updates.taskCheckpoints = {
                ...state.taskCheckpoints,
                [requirementId]: {
                  ...checkpointState,
                  checkpoints: updatedCheckpoints,
                  currentCheckpointId: currentCheckpoint?.id || null,
                },
              };
            }
          }

          return updates;
        });
      }

      if (taskStatus.status === 'completed') {
        console.log(`✅ Task ${requirementId} completed successfully`);

        // ── Fresh state check before terminal update ──
        if (!isBatchStillActive(batchId, requirementId)) {
          cleanupAbandonedTask(requirementId);
          return PollingResults.success();
        }

        const store = getStore();
        const freshState = store.getState();
        freshState.updateTaskStatus(requirementId, createCompletedStatus());
        freshState.finalizeTaskCheckpoints(requirementId);

        store.setState((state: TaskRunnerState) => {
          const batch = state.batches[batchId];
          if (!batch) return state;

          const newTaskProgress = { ...state.taskProgress };
          delete newTaskProgress[requirementId];
          const newTaskActivity = { ...state.taskActivity };
          delete newTaskActivity[requirementId];
          const newTaskCheckpoints = { ...state.taskCheckpoints };
          delete newTaskCheckpoints[requirementId];

          return {
            batches: {
              ...state.batches,
              [batchId]: { ...batch, completedCount: batch.completedCount + 1 },
            },
            executingTasks: new Set([...state.executingTasks].filter(id => id !== requirementId)),
            taskProgress: newTaskProgress,
            taskActivity: newTaskActivity,
            taskCheckpoints: newTaskCheckpoints,
          };
        });

        remoteEvents.taskCompleted(requirement.projectId, {
          taskId: requirementId,
          batchId,
          title: requirement.requirementName,
        });

        // Only emit batch progress if batch still exists after state update
        const currentState = store.getState();
        if (currentState.batches[batchId]) {
          const batchProgress = currentState.getBatchProgress(batchId);
          remoteEvents.batchProgress(requirement.projectId, {
            batchId,
            completed: batchProgress.completed,
            total: batchProgress.total,
          });
        }

        try {
          await fetch('/api/ideas/update-implementation-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requirementName: requirement.requirementName }),
          });
        } catch (err) {
          console.warn('Failed to update idea implementation status:', err);
        }

        try {
          await deleteRequirement(requirement.projectPath, requirement.requirementName);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          store.getState().addOrphanedRequirement(
            requirement.projectPath,
            requirement.requirementName,
            errorMessage
          );
        }

        // Only schedule next task if batch is still running and not paused
        setTimeout(() => {
          const nextState = store.getState();
          const nextBatch = nextState.batches[batchId];
          if (nextBatch && isBatchRunning(nextBatch.status) && !nextState.isPaused) {
            nextState.executeNextTask(batchId, nextState.requirementsCache);
          }
        }, 500);

        return PollingResults.success();

      } else if (taskStatus.status === 'failed' || taskStatus.status === 'session-limit') {
        console.error(`❌ Task ${requirementId} failed: ${taskStatus.error || 'Unknown error'}`);
        const isSessionLimit = taskStatus.status === 'session-limit';

        // ── Fresh state check before terminal update ──
        if (!isBatchStillActive(batchId, requirementId)) {
          cleanupAbandonedTask(requirementId);
          return PollingResults.failure(taskStatus.error || 'Task failed');
        }

        const store = getStore();
        const freshFailedState = store.getState();
        freshFailedState.updateTaskStatus(
          requirementId,
          createFailedStatus(taskStatus.error || 'Task failed', Date.now(), isSessionLimit)
        );

        store.setState((state: TaskRunnerState) => {
          const batch = state.batches[batchId];
          if (!batch) return state;

          const newTaskProgress = { ...state.taskProgress };
          delete newTaskProgress[requirementId];
          const newTaskActivity = { ...state.taskActivity };
          delete newTaskActivity[requirementId];
          const newTaskCheckpoints = { ...state.taskCheckpoints };
          delete newTaskCheckpoints[requirementId];

          return {
            batches: {
              ...state.batches,
              [batchId]: { ...batch, failedCount: batch.failedCount + 1 },
            },
            executingTasks: new Set([...state.executingTasks].filter(id => id !== requirementId)),
            taskProgress: newTaskProgress,
            taskActivity: newTaskActivity,
            taskCheckpoints: newTaskCheckpoints,
          };
        });

        remoteEvents.taskFailed(requirement.projectId, {
          taskId: requirementId,
          batchId,
          title: requirement.requirementName,
          error: taskStatus.error || 'Task failed',
        });

        // Only emit batch progress if batch still exists
        const failedState = store.getState();
        if (failedState.batches[batchId]) {
          const failedBatchProgress = failedState.getBatchProgress(batchId);
          remoteEvents.batchProgress(requirement.projectId, {
            batchId,
            completed: failedBatchProgress.completed,
            total: failedBatchProgress.total,
          });
        }

        // Only schedule next task if batch is still running and not paused
        setTimeout(() => {
          const nextState = store.getState();
          const nextBatch = nextState.batches[batchId];
          if (nextBatch && isBatchRunning(nextBatch.status) && !nextState.isPaused) {
            nextState.executeNextTask(batchId, nextState.requirementsCache);
          }
        }, 1000);

        return PollingResults.failure(taskStatus.error || 'Task failed');
      }

      return PollingResults.continue();

    } catch (error) {
      console.error('Error polling task status:', error);
      // Even on error, check if batch was cleared — don't keep retrying a dead batch
      if (!isBatchStillActive(batchId, requirementId)) {
        cleanupAbandonedTask(requirementId);
        return PollingResults.success();
      }
      return PollingResults.continue();
    }
  };
}

/**
 * Start polling for task completion using the polling manager
 */
export function startTaskPolling(
  taskId: string,
  requirementId: string,
  batchId: BatchId,
  requirement: ProjectRequirement
): void {
  console.log(`🔄 Starting SSE polling for task: ${requirementId}`);

  const callback = createPollingCallback(taskId, requirementId, batchId, requirement);

  // Use SSE-first mode: connects to /api/claude-code/tasks/{taskId}/stream
  // and fires callback on each server push. Falls back to 30s polling if SSE drops.
  startSSEPolling(requirementId, taskId, callback, {
    onAttempt: (attempt) => {
      if (attempt % 6 === 0) {
        console.log(`⏳ Polling attempt #${attempt} for task: ${requirementId}`);
      }
    },
  });
}
