/**
 * Orphan Process Reaper
 *
 * On server startup, identifies CLI processes from previous server instances
 * by checking PIDs stored in the session DB. Kills any that are still running
 * and marks their sessions as failed.
 */

import { logger } from '@/lib/logger';
import type { sessionRepository as SessionRepository } from '@/app/db/repositories/session.repository';

/** The subset of the session repository the reapers depend on. */
type SessionRepo = Pick<
  typeof SessionRepository,
  | 'getSessionsWithPids'
  | 'updateStatus'
  | 'clearAllPids'
  | 'getStaleRunning'
  | 'bulkDeleteStale'
>;

/**
 * Lazily load the real session repository. Kept behind require() to avoid a
 * circular dependency at module load time (schema post-init pulls this module
 * in during DB init). Injectable so tests can supply a repo bound to an
 * isolated database — vitest resolves require() and ESM import to distinct
 * module instances, so injection is the only reliable way to share one db.
 */
function loadSessionRepository(): SessionRepo {
  return require('@/app/db/repositories/session.repository').sessionRepository;
}

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
export function reapOrphanedProcesses(
  sessionRepository: SessionRepo = loadSessionRepository()
): { reaped: number; alreadyDead: number } {
  let reaped = 0;
  let alreadyDead = 0;

  try {
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

/**
 * Staleness thresholds for the automatic sweeper. A 'running' session whose
 * heartbeat has not advanced within `runningMinutes` is treated as dead; the
 * terminal engine touches updated_at every ~30s while alive, and the queue
 * engine on each status write, so a healthy long run never crosses this.
 */
export interface StaleThresholds {
  runningMinutes: number;
  pausedHours: number;
  pendingHours: number;
}

export const DEFAULT_STALE_THRESHOLDS: StaleThresholds = {
  runningMinutes: 30,
  pausedHours: 24,
  pendingHours: 6,
};

/**
 * Reap stale sessions whose heartbeat has gone cold. This is the automatic
 * counterpart the repository comment (getStale* helpers had no callers) called
 * for: it kills any still-live OS process behind a stale 'running' row, then
 * atomically deletes the stale rows (bulkDeleteStale re-checks the cutoffs at
 * delete time, closing the TOCTOU window against an arriving heartbeat).
 */
export function reapStaleSessions(
  thresholds: StaleThresholds = DEFAULT_STALE_THRESHOLDS,
  sessionRepository: SessionRepo = loadSessionRepository()
): { killed: number; deleted: number } {
  let killed = 0;
  let deleted = 0;

  try {
    const staleRunning = sessionRepository.getStaleRunning(thresholds.runningMinutes);
    for (const session of staleRunning) {
      const pid = session.pid;
      if (pid && isProcessAlive(pid)) {
        logger.info(`[StaleReaper] Killing process PID ${pid} behind stale session ${session.id}`);
        if (killProcess(pid)) killed++;
      }
    }

    deleted = sessionRepository.bulkDeleteStale(thresholds);
    if (deleted > 0 || killed > 0) {
      logger.info(`[StaleReaper] Swept ${deleted} stale session(s), killed ${killed} live process(es)`);
    }
  } catch (err) {
    logger.error('[StaleReaper] Failed to reap stale sessions:', { error: err });
  }

  return { killed, deleted };
}

/** How often the background sweeper runs (5 minutes). */
const STALE_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

// HMR-safe singleton: survive Next.js dev module reloads so we never stack up
// multiple intervals against the same process.
const globalForSweeper = globalThis as unknown as {
  staleSessionSweeper: ReturnType<typeof setInterval> | undefined;
};

/**
 * Start the periodic stale-session sweeper. Idempotent and HMR-safe; the
 * interval is unref'd so it never keeps the Node process alive on its own.
 * Call once during server startup (after the one-shot PID reap).
 */
export function startStaleSessionSweeper(
  thresholds: StaleThresholds = DEFAULT_STALE_THRESHOLDS,
  intervalMs: number = STALE_SWEEP_INTERVAL_MS
): void {
  if (globalForSweeper.staleSessionSweeper) return;

  const handle = setInterval(() => {
    reapStaleSessions(thresholds);
  }, intervalMs);

  // Do not hold the event loop open for this maintenance timer.
  if (typeof handle.unref === 'function') handle.unref();

  globalForSweeper.staleSessionSweeper = handle;
  logger.info(`[StaleReaper] Background sweeper started (every ${Math.round(intervalMs / 1000)}s)`);
}
