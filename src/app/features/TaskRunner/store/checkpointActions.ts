/**
 * Checkpoint Management Actions
 * Initialize, update, finalize, and clear task checkpoints
 */

import type { BuiltRules } from '@/lib/rules/types';
import type { TaskActivity, ActivityEvent } from '../lib/activityClassifier.types';
import type { TaskRunnerState } from './taskRunnerStore';
import { createTaskCheckpointState } from '../lib/checkpointExtractor';
import { updateCheckpointStates, finalizeCheckpoints, autoAdvanceCheckpoints } from '../lib/checkpointDetector';

type Set = (fn: (state: TaskRunnerState) => Partial<TaskRunnerState> | TaskRunnerState) => void;

export function createCheckpointActions(set: Set) {
  return {
    initializeCheckpoints: (taskId: string, builtRules: BuiltRules) => {
      set((state) => ({
        taskCheckpoints: {
          ...state.taskCheckpoints,
          [taskId]: createTaskCheckpointState(taskId, builtRules),
        },
      }));
    },

    updateCheckpoints: (taskId: string, activity: TaskActivity, events: ActivityEvent[]) => {
      set((state) => {
        const checkpointState = state.taskCheckpoints[taskId];
        if (!checkpointState) return state;

        let updatedCheckpoints = updateCheckpointStates(
          checkpointState.checkpoints,
          activity,
          events
        );

        updatedCheckpoints = autoAdvanceCheckpoints(updatedCheckpoints);

        const currentCheckpoint = updatedCheckpoints.find(
          (c) => c.status === 'in_progress'
        );

        return {
          taskCheckpoints: {
            ...state.taskCheckpoints,
            [taskId]: {
              ...checkpointState,
              checkpoints: updatedCheckpoints,
              currentCheckpointId: currentCheckpoint?.id || null,
            },
          },
        };
      });
    },

    finalizeTaskCheckpoints: (taskId: string) => {
      set((state) => {
        const checkpointState = state.taskCheckpoints[taskId];
        if (!checkpointState) return state;

        return {
          taskCheckpoints: {
            ...state.taskCheckpoints,
            [taskId]: {
              ...checkpointState,
              checkpoints: finalizeCheckpoints(checkpointState.checkpoints),
              currentCheckpointId: null,
            },
          },
        };
      });
    },

    clearTaskCheckpoints: (taskId: string) => {
      set((state) => {
        const { [taskId]: _, ...rest } = state.taskCheckpoints;
        return { taskCheckpoints: rest };
      });
    },
  };
}
