/**
 * Checkpoint Extractor
 * Extracts checkpoints from BuiltRules based on included rule IDs
 */

import type { BuiltRules } from '@/lib/rules/types';
import type { Checkpoint, TaskCheckpointState } from './checkpoint.types';
import { CHECKPOINT_METADATA } from './checkpoint.types';

/**
 * Extract checkpoints from built rules
 * Only creates checkpoints for rules that have metadata defined
 *
 * @param builtRules - The result of rulesLoader.buildRules()
 * @returns Array of checkpoints in order
 */
export function extractCheckpointsFromRules(builtRules: BuiltRules): Checkpoint[] {
  const checkpoints: Checkpoint[] = [];

  for (let i = 0; i < builtRules.includedRuleIds.length; i++) {
    const ruleId = builtRules.includedRuleIds[i];
    const metadata = CHECKPOINT_METADATA[ruleId];

    // Only create checkpoint if metadata is defined
    // This allows rules like 'theming' to be included but not have a checkpoint
    if (metadata) {
      checkpoints.push({
        id: ruleId,
        label: metadata.label,
        activeLabel: metadata.activeLabel,
        status: 'pending',
        order: i,
      });
    }
  }

  return checkpoints;
}

/**
 * Create initial checkpoint state for a task
 *
 * @param taskId - The task identifier
 * @param builtRules - The result of rulesLoader.buildRules()
 * @returns TaskCheckpointState with all checkpoints pending
 */
export function createTaskCheckpointState(
  taskId: string,
  builtRules: BuiltRules
): TaskCheckpointState {
  return {
    taskId,
    checkpoints: extractCheckpointsFromRules(builtRules),
    currentCheckpointId: null,
  };
}

/**
 * Get progress summary for checkpoints
 *
 * @param checkpoints - Array of checkpoints
 * @returns Object with completed/total counts
 */
export function getCheckpointProgress(checkpoints: Checkpoint[]): {
  completed: number;
  total: number;
  current: Checkpoint | null;
} {
  const completed = checkpoints.filter(c => c.status === 'completed').length;
  const total = checkpoints.filter(c => c.status !== 'skipped').length;
  const current = checkpoints.find(c => c.status === 'in_progress') || null;

  return { completed, total, current };
}
