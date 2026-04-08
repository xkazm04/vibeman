/**
 * Signal Weighting
 *
 * Type-to-weight mapping for goal lifecycle signals.
 * Pure configuration and calculation - no DB dependencies.
 */

import type { DbGoal, GoalSignalType } from '@/app/db/models/types';

/** Progress weights by signal type */
export const SIGNAL_WEIGHTS: Record<GoalSignalType, number> = {
  implementation_log: 15,
  requirement_completed: 20,
  git_commit: 5,
  scan_completed: 8,
  idea_implemented: 12,
  context_updated: 3,
  manual_update: 0, // manual updates carry explicit progress_delta
  standup_risk_alert: 0, // informational signal - records risk, no progress delta
};

/**
 * Calculate progress delta for a signal based on type and context match
 */
export function calculateProgressDelta(
  goal: DbGoal,
  input: { signalType: GoalSignalType; contextId?: string }
): number {
  const baseWeight = SIGNAL_WEIGHTS[input.signalType];

  // If the signal is context-matched, give full weight
  const contextMultiplier = (goal.context_id && goal.context_id === input.contextId) ? 1.0 : 0.3;

  return Math.round(baseWeight * contextMultiplier);
}
