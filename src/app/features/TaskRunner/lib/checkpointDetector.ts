/**
 * Checkpoint Detector
 * Maps activities to checkpoint transitions based on tool usage patterns
 */

import type { TaskActivity, ActivityEvent } from './activityClassifier.types';
import type { Checkpoint } from './checkpoint.types';

/**
 * Detection rule for a checkpoint
 */
interface DetectionRule {
  /** Returns true if checkpoint should start */
  startOn: (activity: TaskActivity, events: ActivityEvent[]) => boolean;
  /** Returns true if checkpoint should complete */
  completeOn: (activity: TaskActivity, events: ActivityEvent[]) => boolean;
}

/**
 * Detection rules for each checkpoint
 * Maps checkpoint IDs to their start/complete conditions
 */
const DETECTION_RULES: Record<string, DetectionRule> = {
  'core-guidelines': {
    // Starts when analyzing or reading files
    startOn: (activity) =>
      activity.phase === 'analyzing' ||
      activity.currentActivity?.type === 'reading',
    // Completes when we have some reads and moved past analyzing
    completeOn: (activity) =>
      (activity.toolCounts['Read'] ?? 0) > 0 &&
      activity.phase !== 'analyzing',
  },

  'file-structure': {
    // Starts after analyzing, when planning or creating files
    startOn: (activity) =>
      activity.phase === 'planning' ||
      (activity.currentActivity?.type === 'writing' &&
        activity.phase === 'implementing'),
    // Completes when we start implementing
    completeOn: (activity) =>
      activity.phase === 'implementing' &&
      ((activity.toolCounts['Write'] ?? 0) > 0 ||
        (activity.toolCounts['Edit'] ?? 0) > 0),
  },

  'test-selectors': {
    // Starts when editing tsx/jsx files
    startOn: (activity, events) =>
      events.some(
        (e) =>
          (e.tool === 'Edit' || e.tool === 'Write') &&
          (e.target?.includes('.tsx') || e.target?.includes('.jsx'))
      ),
    // Completes when we have multiple edits
    completeOn: (activity) =>
      (activity.toolCounts['Edit'] ?? 0) >= 2 ||
      activity.phase === 'validating',
  },

  'documentation-policy': {
    // This is implicit - starts and completes with file operations
    startOn: (activity) =>
      (activity.toolCounts['Write'] ?? 0) > 0 ||
      (activity.toolCounts['Edit'] ?? 0) > 0,
    // Completes when implementing is done
    completeOn: (activity) =>
      activity.phase === 'validating' ||
      (activity.toolCounts['Bash'] ?? 0) > 0,
  },

  'implementation-logging': {
    // Starts when we see a curl command to implementation-log
    startOn: (activity, events) =>
      events.some(
        (e) =>
          e.tool === 'Bash' &&
          e.target?.includes('implementation-log')
      ),
    // Completes after the curl command finishes
    completeOn: (activity, events) =>
      events.some(
        (e) =>
          e.tool === 'Bash' &&
          e.target?.includes('implementation-log')
      ),
  },

  'screenshot-capture': {
    // Starts when we see a curl command to tester/screenshot
    startOn: (activity, events) =>
      events.some(
        (e) =>
          e.tool === 'Bash' &&
          e.target?.includes('tester/screenshot')
      ),
    // Completes after screenshot API calls
    completeOn: (activity, events) =>
      events.filter(
        (e) =>
          e.tool === 'Bash' &&
          e.target?.includes('screenshot')
      ).length >= 1,
  },

  'git-operations': {
    // Starts when we see a git command
    startOn: (activity, events) =>
      events.some(
        (e) =>
          e.tool === 'Bash' &&
          (e.target?.startsWith('git ') || e.target?.includes('git add'))
      ),
    // Completes after git push or commit
    completeOn: (activity, events) =>
      events.some(
        (e) =>
          e.tool === 'Bash' &&
          (e.target?.includes('git push') ||
            e.target?.includes('git commit'))
      ),
  },

  'final-checklist': {
    // Starts during validation phase
    startOn: (activity) => activity.phase === 'validating',
    // Never auto-completes - finalized when task completes
    completeOn: () => false,
  },
};

/**
 * Update checkpoint states based on current activity
 *
 * @param checkpoints - Current checkpoints array
 * @param activity - Current task activity
 * @param events - Activity event history
 * @returns Updated checkpoints array
 */
export function updateCheckpointStates(
  checkpoints: Checkpoint[],
  activity: TaskActivity,
  events: ActivityEvent[]
): Checkpoint[] {
  return checkpoints.map((checkpoint) => {
    const rules = DETECTION_RULES[checkpoint.id];
    if (!rules) return checkpoint;

    // Skip if already completed or skipped
    if (checkpoint.status === 'completed' || checkpoint.status === 'skipped') {
      return checkpoint;
    }

    // Check for start conditions
    if (checkpoint.status === 'pending') {
      if (rules.startOn(activity, events)) {
        return {
          ...checkpoint,
          status: 'in_progress' as const,
          startedAt: Date.now(),
        };
      }
    }

    // Check for completion conditions
    if (checkpoint.status === 'in_progress') {
      if (rules.completeOn(activity, events)) {
        return {
          ...checkpoint,
          status: 'completed' as const,
          completedAt: Date.now(),
        };
      }
    }

    return checkpoint;
  });
}

/**
 * Get the current active checkpoint
 *
 * @param checkpoints - Array of checkpoints
 * @returns The checkpoint that is currently in_progress, or null
 */
export function getCurrentCheckpoint(checkpoints: Checkpoint[]): Checkpoint | null {
  return checkpoints.find((c) => c.status === 'in_progress') || null;
}

/**
 * Mark all remaining checkpoints as completed
 * Called when the task finishes successfully
 *
 * @param checkpoints - Array of checkpoints
 * @returns Updated checkpoints with all pending/in_progress marked complete
 */
export function finalizeCheckpoints(checkpoints: Checkpoint[]): Checkpoint[] {
  return checkpoints.map((checkpoint) => {
    if (checkpoint.status === 'pending' || checkpoint.status === 'in_progress') {
      return {
        ...checkpoint,
        status: 'completed' as const,
        completedAt: Date.now(),
      };
    }
    return checkpoint;
  });
}

/**
 * Auto-advance checkpoints that should be in sequential order
 * If a later checkpoint starts, mark earlier pending ones as completed
 *
 * @param checkpoints - Array of checkpoints
 * @returns Updated checkpoints with sequential completion
 */
export function autoAdvanceCheckpoints(checkpoints: Checkpoint[]): Checkpoint[] {
  // Find the index of the current in_progress checkpoint
  const currentIndex = checkpoints.findIndex((c) => c.status === 'in_progress');
  if (currentIndex <= 0) return checkpoints;

  // Mark all earlier pending checkpoints as completed
  return checkpoints.map((checkpoint, index) => {
    if (index < currentIndex && checkpoint.status === 'pending') {
      return {
        ...checkpoint,
        status: 'completed' as const,
        completedAt: Date.now(),
      };
    }
    return checkpoint;
  });
}
