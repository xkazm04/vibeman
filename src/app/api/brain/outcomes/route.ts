/**
 * Brain Outcomes API
 * Returns direction implementation outcomes and statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { directionOutcomeDb, behavioralSignalDb } from '@/app/db';
import { checkProjectAccess } from '@/lib/api-helpers/accessControl';
import { OUTCOMES_WINDOW_DAYS } from '@/lib/brain/config';

export const dynamic = 'force-dynamic';

/**
 * Compute outcome-like stats from behavioral signals (implementation type)
 * when direction_outcomes table has sparse data
 */
function computeSignalStats(projectId: string, days?: number) {
  const windowDays = days || OUTCOMES_WINDOW_DAYS;
  const signals = behavioralSignalDb.getByTypeAndWindow(projectId, 'implementation', windowDays);

  let successful = 0;
  let failed = 0;

  for (const signal of signals) {
    try {
      const data = JSON.parse(signal.data);
      if (data.success === true) {
        successful++;
      } else if (data.success === false) {
        failed++;
      }
    } catch {
      // Skip unparseable signals
    }
  }

  return {
    total: signals.length,
    successful,
    failed,
  };
}

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!, 10) : undefined;
    const compareDays = searchParams.get('compareDays') ? parseInt(searchParams.get('compareDays')!, 10) : undefined;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Verify project exists and caller has access
    const accessDenied = checkProjectAccess(projectId, request);
    if (accessDenied) return accessDenied;

    // Get recent outcomes
    const outcomes = directionOutcomeDb.getByProject(projectId, { limit });

    // Get statistics
    const stats = directionOutcomeDb.getStats(projectId, days);

    // Supplement with behavioral signal stats when direction outcomes are sparse
    const signalStats = computeSignalStats(projectId, days);

    // Pick the single source with more total data to keep stats internally consistent
    // (total must equal successful + failed + reverted + pending)
    const useSignals = signalStats.total > stats.total;
    const mergedStats = useSignals
      ? {
          total: signalStats.total,
          successful: signalStats.successful,
          failed: signalStats.failed,
          reverted: 0,
          pending: signalStats.total - signalStats.successful - signalStats.failed,
          avgSatisfaction: stats.avgSatisfaction,
        }
      : {
          total: stats.total,
          successful: stats.successful,
          failed: stats.failed,
          reverted: stats.reverted,
          pending: stats.pending,
          avgSatisfaction: stats.avgSatisfaction,
        };

    // Period-over-period comparison when compareDays is specified
    let priorStats: { total: number; successful: number; failed: number; reverted: number; pending: number } | null = null;
    if (compareDays && compareDays > 0) {
      const now = new Date();
      const currentStart = new Date(now.getTime() - compareDays * 86400000).toISOString();
      const priorStart = new Date(now.getTime() - compareDays * 2 * 86400000).toISOString();

      const currentWindowStats = directionOutcomeDb.getStatsByDateRange(projectId, currentStart, now.toISOString());
      const priorWindowStats = directionOutcomeDb.getStatsByDateRange(projectId, priorStart, currentStart);

      // Also check behavioral signals for comparison windows
      const currentSignalStats = computeSignalStats(projectId, compareDays);
      const priorSignalStats = computeSignalStats(projectId, compareDays * 2);
      // Prior signal window = total from 2x window minus current window
      const priorSignalOnly = {
        total: priorSignalStats.total - currentSignalStats.total,
        successful: priorSignalStats.successful - currentSignalStats.successful,
        failed: priorSignalStats.failed - currentSignalStats.failed,
      };

      const useSignalsCurrent = currentSignalStats.total > currentWindowStats.total;
      const useSignalsPrior = priorSignalOnly.total > priorWindowStats.total;

      // Override mergedStats with windowed current stats for consistency
      if (useSignalsCurrent) {
        mergedStats.total = currentSignalStats.total;
        mergedStats.successful = currentSignalStats.successful;
        mergedStats.failed = currentSignalStats.failed;
        mergedStats.reverted = 0;
        mergedStats.pending = currentSignalStats.total - currentSignalStats.successful - currentSignalStats.failed;
      } else {
        mergedStats.total = currentWindowStats.total;
        mergedStats.successful = currentWindowStats.successful;
        mergedStats.failed = currentWindowStats.failed;
        mergedStats.reverted = currentWindowStats.reverted;
        mergedStats.pending = currentWindowStats.pending;
      }

      priorStats = useSignalsPrior
        ? {
            total: priorSignalOnly.total,
            successful: priorSignalOnly.successful,
            failed: priorSignalOnly.failed,
            reverted: 0,
            pending: Math.max(0, priorSignalOnly.total - priorSignalOnly.successful - priorSignalOnly.failed),
          }
        : {
            total: priorWindowStats.total,
            successful: priorWindowStats.successful,
            failed: priorWindowStats.failed,
            reverted: priorWindowStats.reverted,
            pending: priorWindowStats.pending,
          };
    }

    return NextResponse.json({
      success: true,
      outcomes,
      stats: {
        total: mergedStats.total,
        successful: mergedStats.successful,
        failed: mergedStats.failed,
        reverted: mergedStats.reverted,
        pending: mergedStats.pending,
        avgSatisfaction: mergedStats.avgSatisfaction,
      },
      ...(priorStats ? { priorStats } : {}),
    });
  } catch (error) {
    console.error('Failed to get outcomes:', error);
    return NextResponse.json(
      { error: 'Failed to get outcomes' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGET, '/api/brain/outcomes');
