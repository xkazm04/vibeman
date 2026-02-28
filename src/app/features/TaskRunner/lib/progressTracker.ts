/**
 * Unified Progress Tracker
 *
 * Single pipeline that processes CLI stdout into a unified ProgressState.
 * Replaces four independent systems:
 *   1. Raw progress lines (string[])            → lines view
 *   2. Activity classification (phase/tool)      → activity view
 *   3. Checkpoint detection (rules-based)        → checkpoints view
 *   4. Store-level percentage tracking            → percentage view
 *
 * Consumers subscribe to the derived views they need rather than
 * maintaining parallel update paths.
 */

import {
  TOOL_NAMES,
  PHASE_WEIGHTS,
} from './constants';
import type {
  ActivityEvent,
  TaskActivity,
} from './activityClassifier.types';
import {
  parseProgressLines,
  classifyActivity,
} from './activityClassifier';
import type { CheckpointStatus } from './checkpoint.types';
import { CHECKPOINT_METADATA } from './checkpoint.types';

// ============================================================================
// Unified ProgressState
// ============================================================================

export interface ProgressCheckpoint {
  id: string;
  label: string;
  activeLabel: string;
  status: CheckpointStatus;
}

export interface ProgressState {
  /** Raw progress lines from CLI stdout */
  lines: string[];
  /** Parsed activity classification */
  activity: TaskActivity;
  /** Derived checkpoints from activity patterns */
  checkpoints: ProgressCheckpoint[];
  /** Normalized progress percentage (0-100) */
  percentage: number;
}

// ============================================================================
// Checkpoint derivation from activity
// ============================================================================

/**
 * Map activity phases to checkpoint completions.
 * Instead of a rules-based state machine, we derive checkpoint states
 * directly from the activity phase and tool counts.
 */
function deriveCheckpoints(activity: TaskActivity): ProgressCheckpoint[] {
  const { phase, toolCounts } = activity;

  const hasReads = (toolCounts[TOOL_NAMES.Read] ?? 0) > 0;
  const hasEditsOrWrites = (toolCounts[TOOL_NAMES.Edit] ?? 0) > 0 || (toolCounts[TOOL_NAMES.Write] ?? 0) > 0;
  const hasBash = (toolCounts[TOOL_NAMES.Bash] ?? 0) > 0;

  const entries = Object.entries(CHECKPOINT_METADATA);

  return entries.map(([id, meta]) => {
    let status: CheckpointStatus = 'pending';

    switch (id) {
      case 'core-guidelines':
        if (hasReads && phase !== 'analyzing') status = 'completed';
        else if (phase === 'analyzing' || hasReads) status = 'in_progress';
        break;

      case 'file-structure':
        if (hasEditsOrWrites) status = 'completed';
        else if (phase === 'planning') status = 'in_progress';
        break;

      case 'test-selectors':
        if (phase === 'validating' || (toolCounts[TOOL_NAMES.Edit] ?? 0) >= 2) status = 'completed';
        else if (hasEditsOrWrites) status = 'in_progress';
        break;

      case 'documentation-policy':
        if (phase === 'validating' || hasBash) status = 'completed';
        else if (hasEditsOrWrites) status = 'in_progress';
        break;

      case 'implementation-logging':
      case 'screenshot-capture':
      case 'ui-verification':
      case 'git-operations':
        if (phase === 'validating' && hasBash) status = 'completed';
        else if (phase === 'validating') status = 'in_progress';
        break;

      case 'final-checklist':
        if (phase === 'validating') status = 'in_progress';
        break;
    }

    return {
      id,
      label: meta.label,
      activeLabel: meta.activeLabel,
      status,
    };
  });
}

// ============================================================================
// Percentage estimation from activity
// ============================================================================

/**
 * Estimate percentage from activity phase and tool counts.
 * Uses phase as a coarse signal, refined by tool diversity.
 */
function estimatePercentage(activity: TaskActivity, lineCount: number): number {
  if (lineCount === 0) return 0;

  // Exhaustive checking is handled by the Record<TaskPhase, number> type of PHASE_WEIGHTS
  const basePercent = PHASE_WEIGHTS[activity.phase];

  // Refine within phase based on tool diversity
  const toolCount = Object.keys(activity.toolCounts).length;
  const diversityBonus = Math.min(toolCount * 2, 10);

  return Math.min(99, basePercent + diversityBonus);
}

// ============================================================================
// Public API
// ============================================================================

const EMPTY_ACTIVITY: TaskActivity = {
  currentActivity: null,
  activityHistory: [],
  toolCounts: {},
  phase: 'idle',
};

/**
 * Process raw progress lines into a unified ProgressState.
 *
 * This is the single entry point replacing four parallel pipelines.
 * Components consume the views they need from the returned state.
 *
 * @param lines - Raw CLI stdout progress lines
 * @returns Unified progress state with all derived views
 */
export function processProgress(lines: string[]): ProgressState {
  if (lines.length === 0) {
    return {
      lines,
      activity: EMPTY_ACTIVITY,
      checkpoints: deriveCheckpoints(EMPTY_ACTIVITY),
      percentage: 0,
    };
  }

  const events: ActivityEvent[] = parseProgressLines(lines);
  const activity = events.length > 0 ? classifyActivity(events) : EMPTY_ACTIVITY;
  const checkpoints = deriveCheckpoints(activity);
  const percentage = estimatePercentage(activity, lines.length);

  return {
    lines,
    activity,
    checkpoints,
    percentage,
  };
}

/**
 * Finalize progress state when a task completes.
 * Marks all checkpoints completed and sets percentage to 100.
 */
export function finalizeProgress(state: ProgressState): ProgressState {
  return {
    ...state,
    percentage: 100,
    checkpoints: state.checkpoints.map((cp) => ({
      ...cp,
      status: 'completed' as const,
    })),
  };
}
