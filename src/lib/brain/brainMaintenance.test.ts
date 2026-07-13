/**
 * Brain maintenance sweeper tests (Direction 1).
 *
 * Proves the brain maintains itself with no reflection ever completing: decay +
 * retention run per project, orphaned evidence is swept, the effectiveness cache
 * is refreshed, and a due project gets exactly one idempotent reflection
 * requirement created (never executed). Per-step failures are counted, not
 * silently swallowed. The interval sweeper is HMR-safe and unref'd.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { __setTestDatabase } from '@/app/db/connection';
import { brainReflectionRepository } from '@/app/db/repositories/brain-reflection.repository';
import {
  runBrainMaintenance,
  startBrainMaintenanceSweeper,
  type BrainMaintenanceDeps,
} from './brainMaintenance';

/** Fully-stubbed deps; individual tests override what they exercise. */
function makeDeps(overrides: Partial<BrainMaintenanceDeps> = {}): BrainMaintenanceDeps {
  return {
    listProjectIds: () => ['p1', 'p2'],
    decaySignals: () => ({ decayed: 2, deleted: 1 }),
    cleanupOrphanEvidence: () => 0,
    refreshEffectiveness: () => {},
    shouldReflect: () => false,
    createReflection: () => ({ created: false }),
    ...overrides,
  };
}

describe('runBrainMaintenance', () => {
  it('runs decay + retention for every project with NO reflection completed', () => {
    const decayed: string[] = [];
    const refreshed: string[] = [];
    const createReflection = vi.fn(() => ({ created: false }));

    const result = runBrainMaintenance(
      makeDeps({
        decaySignals: (pid) => {
          decayed.push(pid);
          return { decayed: 3, deleted: 2 };
        },
        refreshEffectiveness: (pid) => {
          refreshed.push(pid);
        },
        // shouldReflect stays false → createReflection must never fire.
        createReflection,
      })
    );

    expect(decayed).toEqual(['p1', 'p2']);
    expect(refreshed).toEqual(['p1', 'p2']);
    expect(result.decayed).toBe(6);
    expect(result.deleted).toBe(4);
    expect(result.effectivenessRefreshed).toBe(2);
    expect(result.reflectionsCreated).toBe(0);
    expect(createReflection).not.toHaveBeenCalled();
    expect(result.errors).toBe(0);
  });

  it('sweeps orphaned evidence once per pass', () => {
    const cleanup = vi.fn(() => 5);
    const result = runBrainMaintenance(makeDeps({ cleanupOrphanEvidence: cleanup }));
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(result.orphanEvidenceRemoved).toBe(5);
  });

  it('isolates a failing step, counting it instead of aborting the pass', () => {
    const refreshed: string[] = [];
    const result = runBrainMaintenance(
      makeDeps({
        listProjectIds: () => ['bad', 'good'],
        decaySignals: (pid) => {
          if (pid === 'bad') throw new Error('decay boom');
          return { decayed: 1, deleted: 0 };
        },
        refreshEffectiveness: (pid) => {
          refreshed.push(pid);
        },
      })
    );
    // 'bad' decay threw, but both projects still had effectiveness refreshed.
    expect(refreshed).toEqual(['bad', 'good']);
    expect(result.errors).toBe(1);
    expect(result.decayed).toBe(1);
  });

  it('creates a reflection requirement only when the project is due', () => {
    const create = vi.fn(() => ({ created: true }));
    const result = runBrainMaintenance(
      makeDeps({
        listProjectIds: () => ['due', 'not-due'],
        shouldReflect: (pid) => pid === 'due',
        createReflection: create,
      })
    );
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith('due');
    expect(result.reflectionsCreated).toBe(1);
  });
});

describe('reflection auto-create is idempotent (once per threshold crossing)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE brain_reflections (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        trigger_type TEXT,
        scope TEXT NOT NULL DEFAULT 'project',
        started_at TEXT,
        completed_at TEXT,
        error_message TEXT,
        directions_analyzed INTEGER,
        outcomes_analyzed INTEGER,
        signals_analyzed INTEGER,
        guide_sections_updated TEXT,
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX idx_one_active_reflection_per_project
        ON brain_reflections(project_id, scope)
        WHERE status IN ('pending', 'running');
    `);
    __setTestDatabase(db);
  });

  afterEach(() => {
    __setTestDatabase(null);
    db.close();
    vi.restoreAllMocks();
  });

  it('creates one pending reflection then no-ops while it stays active', () => {
    // Real createReflection backed by createIfNotActive against the in-memory DB.
    const createReflection = (projectId: string) => {
      const id = `ref_${Math.random().toString(36).slice(2)}`;
      const res = brainReflectionRepository.createIfNotActive({
        id,
        project_id: projectId,
        trigger_type: 'scheduled',
        scope: 'project',
      });
      return { created: res.created };
    };

    const deps = makeDeps({
      listProjectIds: () => ['proj-due'],
      shouldReflect: () => true, // still "due" on both passes
      createReflection,
    });

    const first = runBrainMaintenance(deps);
    const second = runBrainMaintenance(deps);

    expect(first.reflectionsCreated).toBe(1);
    expect(second.reflectionsCreated).toBe(0); // idempotent — no duplicate

    const rows = db
      .prepare(`SELECT status FROM brain_reflections WHERE project_id = 'proj-due'`)
      .all() as Array<{ status: string }>;
    expect(rows).toHaveLength(1);
    // Requirement only — never started/executed.
    expect(rows[0].status).toBe('pending');
  });
});

describe('startBrainMaintenanceSweeper', () => {
  it('registers a single unref-d interval and is idempotent', () => {
    const g = globalThis as unknown as { brainMaintenanceSweeper?: NodeJS.Timeout };
    if (g.brainMaintenanceSweeper) {
      clearInterval(g.brainMaintenanceSweeper);
      g.brainMaintenanceSweeper = undefined;
    }

    startBrainMaintenanceSweeper(60_000);
    const first = g.brainMaintenanceSweeper;
    expect(first).toBeDefined();

    startBrainMaintenanceSweeper(60_000);
    expect(g.brainMaintenanceSweeper).toBe(first); // no second interval

    if (g.brainMaintenanceSweeper) {
      clearInterval(g.brainMaintenanceSweeper);
      g.brainMaintenanceSweeper = undefined;
    }
  });
});
