/**
 * Goal momentum classifier
 *
 * Categorises an in-progress goal as stalled / steady / accelerating based on
 * how recently it has been touched and whether it shows forward progress.
 * Pure heuristic — no signal-store dependency — so the constellation can
 * paint pulse/glow effects without fetching extra data.
 */

import type { Goal } from '@/types';

export type Momentum = 'stalled' | 'steady' | 'accelerating';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

/**
 * Classify a goal's momentum.
 *
 *   stalled       — in_progress + last touched > 7 days ago
 *   accelerating  — in_progress + last touched < 1 day ago + has visible progress
 *   steady        — everything else (done/open/rejected, or in_progress with normal cadence)
 *
 * If updated_at is missing we conservatively treat the goal as steady — we'd
 * rather under-flag than wrongly mark something as stalled.
 */
export function classifyMomentum(goal: Pick<Goal, 'status' | 'progress' | 'updated_at'>): Momentum {
  if (goal.status !== 'in_progress') return 'steady';

  if (!goal.updated_at) return 'steady';
  const updatedMs = new Date(goal.updated_at).getTime();
  if (!Number.isFinite(updatedMs)) return 'steady';

  const ageMs = Date.now() - updatedMs;

  if (ageMs > SEVEN_DAYS_MS) return 'stalled';
  if (ageMs < ONE_DAY_MS && (goal.progress ?? 0) > 0) return 'accelerating';
  return 'steady';
}
