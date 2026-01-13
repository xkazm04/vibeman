/**
 * Checkpoint Types
 * Types for tracking progress through execution phases
 */

/**
 * Status of a checkpoint
 */
export type CheckpointStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

/**
 * A checkpoint representing a logical phase in task execution
 */
export interface Checkpoint {
  /** Unique identifier matching rule ID (e.g., 'core-guidelines', 'git-operations') */
  id: string;
  /** Display label when not active (e.g., "Execute git operations") */
  label: string;
  /** Display label when in progress (e.g., "Executing git operations") */
  activeLabel: string;
  /** Current status */
  status: CheckpointStatus;
  /** Display order */
  order: number;
  /** Timestamp when checkpoint started */
  startedAt?: number;
  /** Timestamp when checkpoint completed */
  completedAt?: number;
}

/**
 * Checkpoint state for a specific task
 */
export interface TaskCheckpointState {
  /** Task identifier */
  taskId: string;
  /** Array of checkpoints for this task */
  checkpoints: Checkpoint[];
  /** ID of the currently active checkpoint */
  currentCheckpointId: string | null;
}

/**
 * Metadata for checkpoint display
 */
export interface CheckpointMetadata {
  /** Label for pending/completed state */
  label: string;
  /** Label for in_progress state */
  activeLabel: string;
}

/**
 * Map of rule IDs to checkpoint display metadata
 * Note: Not all rules have checkpoints (e.g., theming is implicit)
 */
export const CHECKPOINT_METADATA: Record<string, CheckpointMetadata> = {
  'core-guidelines': {
    label: 'Analyze requirement',
    activeLabel: 'Analyzing requirement',
  },
  'file-structure': {
    label: 'Plan file structure',
    activeLabel: 'Planning structure',
  },
  'test-selectors': {
    label: 'Add test selectors',
    activeLabel: 'Adding test selectors',
  },
  // 'theming' rule is included but has no checkpoint (implicit in implementation)
  'documentation-policy': {
    label: 'Check documentation',
    activeLabel: 'Checking docs policy',
  },
  'implementation-logging': {
    label: 'Log implementation',
    activeLabel: 'Logging implementation',
  },
  'screenshot-capture': {
    label: 'Capture screenshot',
    activeLabel: 'Capturing screenshot',
  },
  'ui-verification': {
    label: 'Verify UI changes',
    activeLabel: 'Verifying UI',
  },
  'git-operations': {
    label: 'Execute git operations',
    activeLabel: 'Executing git',
  },
  'final-checklist': {
    label: 'Verify checklist',
    activeLabel: 'Verifying checklist',
  },
};
