/**
 * Brain Dashboard API - Combined endpoint
 *
 * GET /api/brain/dashboard?projectId=xxx
 *
 * Returns context, outcomes, reflection status, and anomalies in a single
 * response. Replaces 4 separate API calls on BrainLayout mount.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { getContext } from '@/lib/brain/brainService';
import { directionOutcomeDb, behavioralSignalDb } from '@/app/db';
import { reflectionAgent } from '@/lib/brain/reflectionAgent';
import { detectAnomalies } from '@/lib/brain/anomalyDetector';

export const dynamic = 'force-dynamic';

/**
 * Compute outcome-like stats from behavioral signals (implementation type)
 * when direction_outcomes table has sparse data.
 * Mirrors the logic in /api/brain/outcomes/route.ts.
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
    } catch { /* skip */ }
  }

  return { total: signals.length, successful, failed };
}

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Fire all data fetches in parallel
    const [contextResult, outcomesResult, reflectionResult, anomaliesResult] =
      await Promise.allSettled([
        // 1. Behavioral context
        Promise.resolve(getContext({ projectId, windowDays: 7, noCache: false })),

        // 2. Outcomes + stats
        Promise.resolve((() => {
          const outcomes = directionOutcomeDb.getByProject(projectId, { limit: 10 });
          const stats = directionOutcomeDb.getStats(projectId);
          const signalStats = computeSignalStats(projectId);

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

          return { outcomes, stats: mergedStats };
        })()),

        // 3. Reflection status + trigger check
        Promise.resolve((() => {
          const status = reflectionAgent.getStatus(projectId);
          const shouldTrigger = reflectionAgent.shouldTrigger(projectId);
          return { ...status, shouldTrigger: shouldTrigger.shouldTrigger, triggerReason: shouldTrigger.reason };
        })()),

        // 4. Anomaly detection
        Promise.resolve(detectAnomalies(projectId)),
      ]);

    // Build combined response — each section fails gracefully
    const context = contextResult.status === 'fulfilled'
      ? contextResult.value.context
      : null;

    const outcomes = outcomesResult.status === 'fulfilled'
      ? outcomesResult.value
      : { outcomes: [], stats: { total: 0, successful: 0, failed: 0, reverted: 0, pending: 0, avgSatisfaction: null } };

    const reflection = reflectionResult.status === 'fulfilled'
      ? reflectionResult.value
      : { isRunning: false, lastCompleted: null, runningReflection: null, decisionsSinceLastReflection: 0, nextThreshold: 20, shouldTrigger: false, triggerReason: null };

    const anomalies = anomaliesResult.status === 'fulfilled'
      ? anomaliesResult.value.anomalies
      : [];

    return NextResponse.json({
      success: true,
      context,
      outcomes: outcomes.outcomes,
      outcomeStats: outcomes.stats,
      reflection,
      anomalies,
    });
  } catch (error) {
    console.error('[API] Brain dashboard GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGET, '/api/brain/dashboard');
