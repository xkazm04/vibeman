/**
 * Post-initialization hook: reap orphaned CLI processes from previous server instances.
 * This is separated from DB initialization because orphan reaping is unrelated to schema creation.
 */
export function runPostInitHooks() {
  try {
    // Use dynamic import instead of require()
    const { reapOrphanedProcesses, reapStaleSessions, startStaleSessionSweeper } = require('@/lib/claude-terminal/orphanReaper');
    // One-shot: kill processes orphaned by the previous server instance.
    reapOrphanedProcesses();
    // One-shot: clear any sessions left stale by an unclean shutdown.
    reapStaleSessions();
    // Ongoing: periodically sweep sessions whose heartbeat goes cold.
    startStaleSessionSweeper();
  } catch (err) {
    console.warn('[schema] Orphan reaping failed (non-fatal):', err instanceof Error ? err.message : err);
  }

  // Boot-start the scan-queue worker so queued scans process WITHOUT anyone
  // opening the Ideas UI (previously the worker only ever started from the
  // Ideas screen or a file-watch event, so a queued item on a fresh boot sat
  // forever). `recoverAllRunning: true` is safe here: this is a fresh process,
  // so any DB row still marked 'running' is a crashed previous instance's
  // corpse and must be requeued regardless of age. require() keeps the worker's
  // LLM-heavy module subtree out of every route's static graph, matching the
  // dynamic-load contract of the schema module.
  try {
    const { scanQueueWorker } = require('@/lib/scanQueueWorker');
    scanQueueWorker.start({ recoverAllRunning: true });
  } catch (err) {
    console.warn('[schema] Scan-queue worker boot-start failed (non-fatal):', err instanceof Error ? err.message : err);
  }

  try {
    // Ongoing (+ a deferred initial pass): keep the brain healthy without a
    // manual reflection — signal decay, retention prune, orphaned-evidence
    // cleanup, effectiveness-cache refresh, and idempotent auto-creation of due
    // reflection requirements (never executed). HMR-safe + unref'd internally.
    const { startBrainMaintenanceSweeper } = require('@/lib/brain/brainMaintenance');
    startBrainMaintenanceSweeper();
  } catch (err) {
    console.warn('[schema] Brain maintenance start failed (non-fatal):', err instanceof Error ? err.message : err);
  }

  // Rehydrate any ENABLED file watchers. The FileWatcherManager singleton dies
  // with the previous process, so a configured chokidar watcher would otherwise
  // stay silently dead after a restart until the config was re-saved from the UI.
  // require() keeps chokidar + the worker subtree out of every route's static
  // graph, matching the dynamic-load contract of the schema module.
  try {
    const { fileWatcherManager } = require('@/lib/fileWatcher');
    const started = fileWatcherManager.rehydrateWatchers();
    if (started > 0) {
      console.log(`[schema] Rehydrated ${started} file watcher(s) on boot`);
    }
  } catch (err) {
    console.warn('[schema] File-watch rehydrate failed (non-fatal):', err instanceof Error ? err.message : err);
  }
}
