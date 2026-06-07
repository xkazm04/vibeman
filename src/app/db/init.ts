/**
 * Database Initialization — single async authority.
 *
 * All heavy modules (schema DDL, ~70 migration modules, the hot-writes
 * aggregation worker) are loaded via dynamic import() so they compile into
 * ONE shared async chunk evaluated once at boot — instead of riding
 * statically in every API route's module graph. Before this existed, the
 * barrel's static `initializeTables` import put the entire 167-file DB layer
 * (including the 4,499-line migrations index) into all 344 route entries,
 * which was the main Turbopack dev-memory multiplier.
 *
 * Triggered from two places:
 *  - src/instrumentation.ts register() — awaited at server boot, BEFORE any
 *    request is served (the hard guarantee, covers fresh databases).
 *  - src/app/db/index.ts barrel — fire-and-forget on first import (belt for
 *    contexts that don't run instrumentation, e.g. vitest or scripts).
 */

// Small modules, safe to import statically (no schema/migrations in their graphs)
import { closeDatabase } from './connection';
import { closeHotWritesDatabase } from './hot-writes';

// Store the init promise on globalThis so it survives Next.js HMR module
// reloads and is shared across concurrent importers (TOCTOU-safe: the
// promise is stored synchronously before any await).
const INIT_PROMISE_KEY = '__dbInitPromise';
const CLEANUP_KEY = '__dbCleanupRegistered';

export function ensureDbReady(): Promise<void> {
  const g = globalThis as Record<string, unknown>;
  if (!g[INIT_PROMISE_KEY]) {
    g[INIT_PROMISE_KEY] = (async () => {
      const [{ initializeTables }, aggregator, { env }] = await Promise.all([
        import('./schema'),
        import('@/lib/db/hotWritesAggregator'),
        import('@/lib/config/envConfig'),
      ]);
      initializeTables();
      // Start hot-writes aggregation worker (rolls up obs_api_calls ->
      // obs_endpoint_stats AND prunes aggregated raw calls). Default ON;
      // HOT_WRITES_AGGREGATOR_ENABLED=false opts out — note the hot-writes
      // DB then grows unbounded since pruning runs in this worker.
      if (env.hotWritesAggregatorEnabled()) {
        aggregator.startAggregationWorker();
      }
      registerCleanupHandlers(aggregator.stopAggregationWorker);
    })().catch((err: unknown) => {
      // Reset so the next caller retries initialization instead of caching the failure
      g[INIT_PROMISE_KEY] = undefined;
      throw err;
    });
  }
  return g[INIT_PROMISE_KEY] as Promise<void>;
}

/**
 * Register process shutdown handlers exactly once.
 * Ordering matters: stop aggregation worker → close hot DB → close main DB.
 */
function registerCleanupHandlers(stopAggregationWorker: () => void): void {
  const g = globalThis as Record<string, unknown>;
  if (g[CLEANUP_KEY]) return;
  g[CLEANUP_KEY] = true;

  const shutdown = () => {
    stopAggregationWorker();
    closeHotWritesDatabase();
    closeDatabase();
  };

  process.on('exit', shutdown);
  process.on('SIGINT', () => {
    shutdown();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    shutdown();
    process.exit(0);
  });
}
