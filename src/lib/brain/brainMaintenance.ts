/**
 * Brain Maintenance Sweeper
 *
 * The brain's learning/maintenance chain (signal decay, retention deletion,
 * effectiveness-cache refresh, orphaned evidence cleanup) previously ran ONLY
 * inside a manually-triggered reflection completion. On a project that never
 * reflects, signals never decayed, the signals table grew unbounded, and the
 * effectiveness cache went stale. This module runs that maintenance on its own —
 * once at boot and then on an interval — so the brain keeps itself healthy with
 * no user action.
 *
 * It deliberately does NOT execute anything that costs LLM spend. When a project
 * is due for reflection it may CREATE the reflection requirement (an idempotent
 * pending row via createIfNotActive) so it surfaces in TaskRunner, but it never
 * starts or runs the reflection.
 *
 * Dependencies are injected (defaulting to the real modules via lazy require, to
 * avoid pulling the heavy brain graph into the DB-init module and to keep this
 * unit-testable against fakes) — mirroring orphanReaper's shape.
 */

import { logger } from '@/lib/logger';
import {
  DEFAULT_DECAY_FACTOR,
  DEFAULT_RETENTION_DAYS,
  DECAY_START_FRACTION,
  DECAY_START_MIN_DAYS,
} from '@/lib/brain/config';

export interface BrainMaintenanceDeps {
  /** All known project ids to maintain. */
  listProjectIds: () => string[];
  /** Decay + retention-prune a project's signals (ISO-week idempotent). */
  decaySignals: (projectId: string) => { decayed: number; deleted: number };
  /** Sweep orphaned cross-DB signal-evidence rows (global, once per pass). */
  cleanupOrphanEvidence: () => number;
  /** Recompute + repopulate the effectiveness cache for a project. */
  refreshEffectiveness: (projectId: string) => void;
  /** Is the project past its reflection threshold? */
  shouldReflect: (projectId: string) => boolean;
  /** Idempotently create a pending reflection requirement (no execution). */
  createReflection: (projectId: string) => { created: boolean };
}

export interface BrainMaintenanceResult {
  projects: number;
  decayed: number;
  deleted: number;
  orphanEvidenceRemoved: number;
  effectivenessRefreshed: number;
  reflectionsCreated: number;
  /** Count of swallowed per-step failures (also logged). */
  errors: number;
}

/**
 * Build the default (production) dependency set. Everything is lazily required so
 * importing this module at DB-init time does not eagerly pull the brain graph.
 */
function defaultDeps(): BrainMaintenanceDeps {
  return {
    listProjectIds: () => {
      const { projectDb } = require('@/lib/project_database');
      return (projectDb.projects.getAll() as Array<{ id: string }>).map(p => p.id);
    },
    decaySignals: (projectId: string) => {
      const { behavioralSignalRepository } = require('@/app/db/repositories/behavioral-signal.repository');
      // Same guarded decay math as brainService.applySignalDecay — the ISO-week
      // guard inside applyDecay makes this safe even if a reflection also decays.
      const decayStartDays = Math.max(
        DECAY_START_MIN_DAYS,
        Math.floor(DEFAULT_RETENTION_DAYS * DECAY_START_FRACTION)
      );
      const decayed = behavioralSignalRepository.applyDecay(projectId, DEFAULT_DECAY_FACTOR, decayStartDays);
      const deleted = behavioralSignalRepository.deleteOld(projectId, DEFAULT_RETENTION_DAYS);
      try {
        require('@/lib/brain/brainService').invalidateContextCache(projectId);
      } catch {
        /* cache invalidation is best-effort */
      }
      return { decayed, deleted };
    },
    cleanupOrphanEvidence: () => {
      const { behavioralSignalRepository } = require('@/app/db/repositories/behavioral-signal.repository');
      return behavioralSignalRepository.cleanupOrphanedSignalEvidence();
    },
    refreshEffectiveness: (projectId: string) => {
      const { refreshEffectivenessCache } = require('@/lib/brain/behavioralContext');
      refreshEffectivenessCache(projectId);
    },
    shouldReflect: (projectId: string) => {
      const { reflectionAgent } = require('@/lib/brain/reflectionAgent');
      return reflectionAgent.shouldTrigger(projectId).shouldTrigger === true;
    },
    createReflection: (projectId: string) => {
      const { brainReflectionRepository } = require('@/app/db/repositories/brain-reflection.repository');
      const id = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      // Idempotent: the UNIQUE partial index on (project_id, scope) WHERE status IN
      // ('pending','running') means a second attempt while one is still active is a
      // no-op (created:false). This is a REQUIREMENT only — never started/executed.
      const res = brainReflectionRepository.createIfNotActive({
        id,
        project_id: projectId,
        trigger_type: 'scheduled',
        scope: 'project',
      });
      return { created: res.created };
    },
  };
}

/**
 * Run one maintenance pass over all projects. Never throws — every step is
 * isolated so one project's failure cannot abort the others, and swallowed
 * failures are counted + logged (not silent).
 */
export function runBrainMaintenance(
  deps: BrainMaintenanceDeps = defaultDeps()
): BrainMaintenanceResult {
  const result: BrainMaintenanceResult = {
    projects: 0,
    decayed: 0,
    deleted: 0,
    orphanEvidenceRemoved: 0,
    effectivenessRefreshed: 0,
    reflectionsCreated: 0,
    errors: 0,
  };

  // Global step: sweep dangling cross-DB evidence once per pass.
  try {
    result.orphanEvidenceRemoved = deps.cleanupOrphanEvidence();
  } catch (err) {
    result.errors++;
    logger.warn('[BrainMaintenance] Orphan evidence cleanup failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  let projectIds: string[] = [];
  try {
    projectIds = deps.listProjectIds();
  } catch (err) {
    result.errors++;
    logger.error('[BrainMaintenance] Could not list projects', {
      error: err instanceof Error ? err.message : String(err),
    });
    return result;
  }

  result.projects = projectIds.length;

  for (const projectId of projectIds) {
    // Decay + retention — independent of any reflection ever completing.
    try {
      const { decayed, deleted } = deps.decaySignals(projectId);
      result.decayed += decayed;
      result.deleted += deleted;
    } catch (err) {
      result.errors++;
      logger.warn('[BrainMaintenance] Signal decay failed', {
        projectId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Keep the effectiveness cache warm.
    try {
      deps.refreshEffectiveness(projectId);
      result.effectivenessRefreshed++;
    } catch (err) {
      result.errors++;
      logger.warn('[BrainMaintenance] Effectiveness refresh failed', {
        projectId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Auto-create (never execute) a reflection requirement when due.
    try {
      if (deps.shouldReflect(projectId)) {
        const { created } = deps.createReflection(projectId);
        if (created) result.reflectionsCreated++;
      }
    } catch (err) {
      result.errors++;
      logger.warn('[BrainMaintenance] Reflection auto-create failed', {
        projectId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (
    result.decayed > 0 ||
    result.deleted > 0 ||
    result.orphanEvidenceRemoved > 0 ||
    result.reflectionsCreated > 0 ||
    result.errors > 0
  ) {
    logger.info('[BrainMaintenance] Pass complete', { ...result });
  }

  return result;
}

/** How often the background sweeper runs (6 hours). Decay is ISO-week idempotent,
 *  so a sub-weekly cadence never double-decays; retention/cache stay fresh. */
const BRAIN_MAINTENANCE_INTERVAL_MS = 6 * 60 * 60 * 1000;

// HMR-safe singleton: survive Next.js dev module reloads so we never stack up
// multiple intervals against the same process.
const globalForBrainSweeper = globalThis as unknown as {
  brainMaintenanceSweeper: ReturnType<typeof setInterval> | undefined;
};

/**
 * Start the periodic brain-maintenance sweeper. Idempotent and HMR-safe; the
 * interval is unref'd so it never holds the Node process open on its own. Also
 * kicks one deferred initial pass (unref'd) so boot is never blocked. Call once
 * during server startup.
 */
export function startBrainMaintenanceSweeper(
  intervalMs: number = BRAIN_MAINTENANCE_INTERVAL_MS
): void {
  if (globalForBrainSweeper.brainMaintenanceSweeper) return;

  // Initial pass, deferred off the boot path so it never blocks startup.
  const kickoff = setTimeout(() => {
    try {
      runBrainMaintenance();
    } catch (err) {
      logger.error('[BrainMaintenance] Initial pass failed', { error: err });
    }
  }, 0);
  if (typeof kickoff.unref === 'function') kickoff.unref();

  const handle = setInterval(() => {
    try {
      runBrainMaintenance();
    } catch (err) {
      logger.error('[BrainMaintenance] Sweep failed', { error: err });
    }
  }, intervalMs);
  if (typeof handle.unref === 'function') handle.unref();

  globalForBrainSweeper.brainMaintenanceSweeper = handle;
  logger.info(`[BrainMaintenance] Background sweeper started (every ${Math.round(intervalMs / 1000)}s)`);
}
