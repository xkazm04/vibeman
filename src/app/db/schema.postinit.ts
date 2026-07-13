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
}
