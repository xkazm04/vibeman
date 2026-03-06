/**
 * Brain Stats Service — Shared outcome statistics computation
 *
 * Consolidates the computeSignalStats + merge logic that was duplicated
 * across /api/brain/outcomes and /api/brain/dashboard routes.
 */

import { directionOutcomeDb, behavioralSignalDb } from '@/app/db';

export interface OutcomeStats {
  total: number;
  successful: number;
  failed: number;
  reverted: number;
  pending: number;
  avgSatisfaction?: number | null;
}

/**
 * Compute outcome-like stats from behavioral signals (implementation type)
 * when direction_outcomes table has sparse data.
 */
function computeSignalStats(projectId: string, days?: number) {
  const windowDays = days || 30;
  const signals = behavioralSignalDb.getByTypeAndWindow(projectId, 'implementation', windowDays);

  let successful = 0;
  let failed = 0;

  for (const signal of signals) {
    try {
      const data = JSON.parse(signal.data);
      if (data.success === true) successful++;
      else if (data.success === false) failed++;
    } catch { /* skip unparseable signals */ }
  }

  return { total: signals.length, successful, failed };
}

/**
 * Get merged outcome stats — combines direction_outcomes table data with
 * behavioral signal fallback, picking whichever source has more total data
 * to keep stats internally consistent.
 */
export function getMergedOutcomeStats(projectId: string, days?: number): OutcomeStats {
  const stats = directionOutcomeDb.getStats(projectId, days);
  const signalStats = computeSignalStats(projectId, days);

  if (signalStats.total > stats.total) {
    return {
      total: signalStats.total,
      successful: signalStats.successful,
      failed: signalStats.failed,
      reverted: 0,
      pending: signalStats.total - signalStats.successful - signalStats.failed,
      avgSatisfaction: stats.avgSatisfaction,
    };
  }

  return {
    total: stats.total,
    successful: stats.successful,
    failed: stats.failed,
    reverted: stats.reverted,
    pending: stats.pending,
    avgSatisfaction: stats.avgSatisfaction,
  };
}
