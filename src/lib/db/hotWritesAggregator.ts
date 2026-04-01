/**
 * Hot-Writes Aggregation Worker
 *
 * Periodically rolls up data from the hot-writes SQLite database into the
 * main goals.db for dashboard queries and cross-table joins.
 *
 * Aggregation targets:
 * - obs_api_calls → obs_endpoint_stats (hourly rollups, then prune raw calls)
 *
 * Behavioral signals stay in the hot-writes DB permanently (no rollup needed)
 * because the repository reads directly from it. The signals table is
 * self-contained with its own decay and retention logic.
 */

import { getHotWritesDatabase } from '@/app/db/hot-writes';
import { observabilityRepository } from '@/app/db/repositories/observability.repository';

const AGGREGATION_INTERVAL_MS = 5 * 60 * 1000; // Every 5 minutes
const RAW_CALL_RETENTION_HOURS = 24; // Keep raw calls for 24h after aggregation

// Store timer on globalThis so it survives Next.js HMR module reloads.
// Without this, each HMR cycle resets `timer` to null, bypasses the
// `if (timer) return` guard, and spawns a duplicate setInterval worker.
const GLOBAL_TIMER_KEY = '__hotWritesAggregatorTimer' as const;

function getTimer(): ReturnType<typeof setInterval> | null {
  return (globalThis as Record<string, unknown>)[GLOBAL_TIMER_KEY] as ReturnType<typeof setInterval> | null ?? null;
}

function setTimer(value: ReturnType<typeof setInterval> | null): void {
  (globalThis as Record<string, unknown>)[GLOBAL_TIMER_KEY] = value;
}

/**
 * Run a single aggregation cycle.
 * Safe to call concurrently — each cycle is idempotent.
 */
export function runAggregationCycle(): { obsCallsAggregated: number; obsCallsPruned: number } {
  let obsCallsAggregated = 0;
  let obsCallsPruned = 0;

  try {
    const hotDb = getHotWritesDatabase();

    // 1. Discover which projects have un-aggregated API calls
    const projectRows = hotDb.prepare(
      'SELECT DISTINCT project_id FROM obs_api_calls'
    ).all() as Array<{ project_id: string }>;

    // 2. Aggregate hourly stats per project (reads hot-writes, writes main DB)
    for (const { project_id } of projectRows) {
      try {
        obsCallsAggregated += observabilityRepository.aggregateHourlyStats(project_id);
      } catch (err) {
        console.warn(`[HotWritesAggregator] Failed to aggregate obs calls for ${project_id}:`, err);
      }
    }

    // 3. Prune old raw API calls from hot-writes DB (keep recent for direct queries)
    const pruneThreshold = new Date(Date.now() - RAW_CALL_RETENTION_HOURS * 60 * 60 * 1000).toISOString();
    const pruneResult = hotDb.prepare(
      'DELETE FROM obs_api_calls WHERE called_at < ?'
    ).run(pruneThreshold);
    obsCallsPruned = pruneResult.changes;
  } catch (err) {
    console.error('[HotWritesAggregator] Aggregation cycle failed:', err);
  }

  return { obsCallsAggregated, obsCallsPruned };
}

/**
 * Start the background aggregation worker.
 * No-op if already running.
 */
export function startAggregationWorker(): void {
  if (getTimer()) return;

  // Run first cycle after a short delay (let DB init complete)
  setTimeout(() => {
    runAggregationCycle();
  }, 10_000);

  const interval = setInterval(runAggregationCycle, AGGREGATION_INTERVAL_MS);

  // Allow Node to exit even if the timer is still active
  if (interval && typeof interval === 'object' && 'unref' in interval) {
    interval.unref();
  }

  setTimer(interval);
}

/**
 * Stop the background aggregation worker.
 */
export function stopAggregationWorker(): void {
  const timer = getTimer();
  if (timer) {
    clearInterval(timer);
    setTimer(null);
  }
}
