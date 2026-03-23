/**
 * IdeaStatsAggregator — single source of truth for status distribution,
 * acceptance rate, and trend computations across ideas and directions.
 *
 * Both statsApi (Reflection) and weeklyApi (Weekly) delegate to this service
 * so that every view in the Reflector module computes identical numbers for
 * the same underlying data.
 */

import { SuggestionFilter } from './unifiedTypes';

// ── Core types ──────────────────────────────────────────────────────────

export interface StatusDistribution {
  pending: number;
  accepted: number;
  rejected: number;
  implemented: number;
  total: number;
}

export interface AcceptanceResult {
  acceptanceRate: number; // 0–100 rounded integer
  totalAccepted: number;  // numerator used in the calculation
}

export interface TrendResult {
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

// ── Status counting ─────────────────────────────────────────────────────

/**
 * Count statuses for idea-shaped items (pending/accepted/rejected/implemented).
 */
export function countIdeaStatuses(items: Array<{ status: string }>): StatusDistribution {
  const dist: StatusDistribution = { pending: 0, accepted: 0, rejected: 0, implemented: 0, total: items.length };
  for (const item of items) {
    if (item.status === 'pending') dist.pending++;
    else if (item.status === 'accepted') dist.accepted++;
    else if (item.status === 'rejected') dist.rejected++;
    else if (item.status === 'implemented') dist.implemented++;
  }
  return dist;
}

/**
 * Count statuses for direction-shaped items (pending/accepted/rejected — no implemented).
 */
export function countDirectionStatuses(items: Array<{ status: string }>): StatusDistribution {
  const dist: StatusDistribution = { pending: 0, accepted: 0, rejected: 0, implemented: 0, total: items.length };
  for (const item of items) {
    if (item.status === 'pending') dist.pending++;
    else if (item.status === 'accepted') dist.accepted++;
    else if (item.status === 'rejected') dist.rejected++;
  }
  return dist;
}

// ── Acceptance rate ─────────────────────────────────────────────────────

/**
 * Canonical acceptance-rate formula.
 *
 * For ideas: (accepted + implemented) / total
 * For directions: accepted / total  (implemented is always 0)
 * For combined: (ideas.accepted + ideas.implemented + dirs.accepted) / combinedTotal
 *
 * By passing StatusDistribution from countIdeaStatuses / countDirectionStatuses,
 * the formula naturally handles all three cases because direction distributions
 * always have implemented === 0.
 */
export function calculateAcceptanceRate(dist: StatusDistribution): AcceptanceResult {
  const totalAccepted = dist.accepted + dist.implemented;
  const acceptanceRate = dist.total > 0
    ? Math.round((totalAccepted / dist.total) * 100)
    : 0;
  return { acceptanceRate, totalAccepted };
}

/**
 * Calculate acceptance rate for a specific suggestion filter mode.
 */
export function calculateFilteredAcceptanceRate(
  ideas: StatusDistribution,
  directions: StatusDistribution,
  suggestionType: SuggestionFilter,
): AcceptanceResult {
  if (suggestionType === 'ideas') {
    return calculateAcceptanceRate(ideas);
  }
  if (suggestionType === 'directions') {
    return calculateAcceptanceRate(directions);
  }
  // Combined
  return calculateAcceptanceRate(combineDistributions(ideas, directions));
}

// ── Distribution merging ────────────────────────────────────────────────

/**
 * Merge two StatusDistributions into a combined one.
 */
export function combineDistributions(a: StatusDistribution, b: StatusDistribution): StatusDistribution {
  return {
    pending: a.pending + b.pending,
    accepted: a.accepted + b.accepted,
    rejected: a.rejected + b.rejected,
    implemented: a.implemented + b.implemented,
    total: a.total + b.total,
  };
}

// ── Trends ──────────────────────────────────────────────────────────────

/**
 * Calculate week-over-week (or period-over-period) trend.
 */
export function calculateTrend(currentTotal: number, previousTotal: number): TrendResult {
  const changePercent = previousTotal > 0
    ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
    : currentTotal > 0 ? 100 : 0;

  const trend: TrendResult['trend'] =
    currentTotal > previousTotal ? 'up'
    : currentTotal < previousTotal ? 'down'
    : 'stable';

  return { changePercent, trend };
}

/**
 * Determine trend direction from a numeric delta (e.g. acceptance rate change).
 * Uses a ±5 threshold to avoid noise.
 */
export function trendFromDelta(delta: number, threshold = 5): 'up' | 'down' | 'stable' {
  if (delta > threshold) return 'up';
  if (delta < -threshold) return 'down';
  return 'stable';
}
