/**
 * Post-initialization hook: reap orphaned CLI processes from previous server instances.
 * This is separated from DB initialization because orphan reaping is unrelated to schema creation.
 */
export function runPostInitHooks() {
  try {
    // Use dynamic import instead of require()
    const { reapOrphanedProcesses } = require('@/lib/claude-terminal/orphanReaper');
    reapOrphanedProcesses();
  } catch (err) {
    console.warn('[schema] Orphan reaping failed (non-fatal):', err instanceof Error ? err.message : err);
  }
}
