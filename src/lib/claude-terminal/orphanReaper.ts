/**
 * Orphan Process Reaper
 *
 * On server startup, identifies CLI processes from previous server instances
 * by checking PIDs stored in the session DB. Kills any that are still running
 * and marks their sessions as failed.
 */

import { logger } from '@/lib/logger';

/**
 * Check if a process with the given PID is still running.
 */
function isProcessAlive(pid: number): boolean {
  try {
    // signal 0 doesn't kill — just checks if process exists
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Kill a process by PID. Returns true if the kill signal was sent successfully.
 */
function killProcess(pid: number): boolean {
  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}

/**
 * Reap orphaned CLI processes from previous server instances.
 *
 * Call this once during server startup (before accepting new requests).
 * It reads sessions with recorded PIDs from the DB, checks if those processes
 * are still alive, kills them if so, and marks the sessions as failed.
 */
export function reapOrphanedProcesses(): { reaped: number; alreadyDead: number } {
  let reaped = 0;
  let alreadyDead = 0;

  try {
    // Lazy import to avoid circular dependency at module load time
    const { sessionRepository } = require('@/app/db/repositories/session.repository');

    const orphanCandidates = sessionRepository.getSessionsWithPids();

    if (orphanCandidates.length === 0) {
      return { reaped: 0, alreadyDead: 0 };
    }

    logger.info(`[OrphanReaper] Found ${orphanCandidates.length} session(s) with recorded PIDs from previous instance`);

    for (const session of orphanCandidates) {
      const pid = session.pid;
      if (!pid) continue;

      if (isProcessAlive(pid)) {
        logger.info(`[OrphanReaper] Killing orphaned process PID ${pid} (session: ${session.id}, name: ${session.name})`);
        killProcess(pid);
        reaped++;
      } else {
        alreadyDead++;
      }

      // Mark session as failed since the server that owned it is gone
      sessionRepository.updateStatus(session.id, 'failed');
    }

    // Clear all PIDs — they belong to the old server instance
    sessionRepository.clearAllPids();

    logger.info(`[OrphanReaper] Complete: ${reaped} killed, ${alreadyDead} already dead`);
  } catch (err) {
    logger.error('[OrphanReaper] Failed to reap orphaned processes:', { error: err });
  }

  return { reaped, alreadyDead };
}
