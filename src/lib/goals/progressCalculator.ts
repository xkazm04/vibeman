/**
 * Progress Calculator
 *
 * Unified progress math for goal lifecycle.
 * Handles signal-based and sub-goal-based progress blending.
 * Writes to the single authoritative `progress` field with source/confidence metadata.
 */

import { goalRepository } from '@/app/db/repositories/goal.repository';
import { goalSignalRepository, goalSubGoalRepository } from '@/app/db/repositories/goal-lifecycle.repository';

/**
 * Compute inferred progress for a goal based on all its signals.
 * Blends signal-based progress (40%) with sub-goal completion (60%) when sub-goals exist.
 * Caps at 95% - auto-completion needs explicit threshold.
 *
 * Writes to the unified progress model with source='inferred' and
 * confidence derived from signal count and sub-goal coverage.
 */
export function computeInferredProgress(goalId: string): number {
  const signals = goalSignalRepository.getByGoal(goalId);

  if (signals.length === 0) return 0;

  // Sum all progress deltas
  const totalDelta = signals.reduce((sum, s) => sum + (s.progress_delta || 0), 0);

  // Also factor in sub-goal completion
  const subStats = goalSubGoalRepository.getStats(goalId);
  const subGoalProgress = subStats.total > 0
    ? Math.round((subStats.done / subStats.total) * 100)
    : 0;

  // Blend signal-based and sub-goal-based progress
  // Cap at 95% - auto-completion needs explicit threshold
  let progress: number;
  let confidence: number;

  if (subStats.total > 0) {
    // If sub-goals exist, weight them heavily (60% sub-goals, 40% signals)
    progress = Math.round(subGoalProgress * 0.6 + Math.min(totalDelta, 100) * 0.4);
    // Higher confidence when sub-goals provide structure
    confidence = Math.min(60 + subStats.total * 5 + signals.length * 2, 95);
  } else {
    // No sub-goals: use signal-based progress entirely
    progress = Math.min(totalDelta, 100);
    // Lower confidence without sub-goal structure; grows with signal count
    confidence = Math.min(40 + signals.length * 5, 85);
  }

  progress = Math.min(progress, 95);

  // Write unified progress with inferred source
  goalRepository.updateGoalProgress(goalId, progress, 'inferred', confidence);

  return progress;
}
