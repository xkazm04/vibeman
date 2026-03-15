/**
 * Spec Lifecycle Manager
 *
 * Ties spec files on disk to conductor_runs records via the conductor_specs
 * table.  Provides:
 *   - cleanupRunSpecs(runId)   — delete DB rows + disk files for one run
 *   - purgeStaleSpecs(ttlHours) — batch-purge specs for terminal runs older
 *                                 than the given TTL
 *
 * All operations are safe to call even when no specs exist (no-ops).
 */

import { specFileManager } from './specFileManager';
import { specRepository } from './specRepository';

export const specLifecycleManager = {
  /**
   * Remove all spec artifacts (DB rows + disk directory) for a single run.
   * Called on any terminal pipeline state: completed, failed, interrupted.
   * Silently succeeds if nothing exists.
   */
  async cleanupRunSpecs(runId: string): Promise<void> {
    try {
      specRepository.deleteSpecsByRunId(runId);
    } catch {
      // DB row deletion failure is non-fatal; still attempt disk cleanup
    }
    await specFileManager.deleteSpecDir(runId);
  },

  /**
   * Purge spec artifacts for all runs that have been in a terminal state
   * (completed / failed / interrupted) for longer than `ttlHours`.
   *
   * @param ttlHours  Minimum age of the completed_at timestamp (default 24 h)
   * @returns         Count of run directories successfully purged and any errors
   */
  async purgeStaleSpecs(ttlHours = 24): Promise<{ purged: number; errors: number }> {
    const staleRunIds = specRepository.getTerminalRunIdsOlderThan(ttlHours);

    let purged = 0;
    let errors = 0;

    for (const runId of staleRunIds) {
      try {
        await this.cleanupRunSpecs(runId);
        purged++;
      } catch {
        errors++;
      }
    }

    return { purged, errors };
  },
};
