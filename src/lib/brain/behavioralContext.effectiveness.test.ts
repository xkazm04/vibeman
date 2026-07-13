/**
 * Effectiveness single-source-of-truth tests (Direction 2).
 *
 * Proves the hot path (getEffectiveInsightsCached) reads insight_effectiveness_cache
 * instead of recomputing O(insights × directions) per request, that the cached
 * result is identical to the inline computation (parity), and that reflection-time
 * refresh repopulates the cache.
 *
 * Runs against an isolated in-memory main DB via __setTestDatabase.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { __setTestDatabase } from '@/app/db/connection';
import { brainInsightRepository } from '@/app/db/repositories/brain-insight.repository';
import {
  computeEffectiveInsights,
  getEffectiveInsightsCached,
  refreshEffectivenessCache,
} from './behavioralContext';

function createTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE brain_reflections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT
    );
    CREATE TABLE brain_insights (
      id TEXT PRIMARY KEY,
      reflection_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE directions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE insight_effectiveness_cache (
      project_id TEXT NOT NULL,
      min_directions INTEGER NOT NULL DEFAULT 3,
      window_days INTEGER NOT NULL DEFAULT 90,
      insights_json TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      cached_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (project_id, min_directions, window_days)
    );
  `);
}

/** Seed a project with one completed reflection + one helpful insight and a
 *  6-direction history that lifts acceptance from 0% (before) to 100% (after). */
function seedHelpful(db: Database.Database, projectId: string) {
  const T = '2026-06-15T00:00:00.000Z';
  db.prepare(
    `INSERT INTO brain_reflections (id, project_id, status, completed_at, created_at) VALUES (?, ?, 'completed', ?, ?)`
  ).run('ref-1', projectId, T, T);
  db.prepare(
    `INSERT INTO brain_insights (id, reflection_id, project_id, type, title, description, confidence, created_at, updated_at)
     VALUES (?, 'ref-1', ?, 'recommendation', 'Use repository pattern', 'desc', 90, ?, ?)`
  ).run('ins-1', projectId, T, T);

  // 3 rejected before T, 3 accepted after T → +100pp acceptance lift.
  const before = ['2026-06-10', '2026-06-11', '2026-06-12'];
  const after = ['2026-06-20', '2026-06-21', '2026-06-22'];
  before.forEach((d, i) =>
    db.prepare(`INSERT INTO directions (id, project_id, status, created_at) VALUES (?, ?, 'rejected', ?)`)
      .run(`db-${i}`, projectId, `${d}T00:00:00.000Z`)
  );
  after.forEach((d, i) =>
    db.prepare(`INSERT INTO directions (id, project_id, status, created_at) VALUES (?, ?, 'accepted', ?)`)
      .run(`da-${i}`, projectId, `${d}T00:00:00.000Z`)
  );
}

describe('effectiveness single source of truth', () => {
  let db: Database.Database;
  const PID = 'proj-eff';

  beforeEach(() => {
    db = new Database(':memory:');
    createTables(db);
    __setTestDatabase(db);
  });

  afterEach(() => {
    __setTestDatabase(null);
    db.close();
    vi.restoreAllMocks();
  });

  it('surfaces a helpful insight with gate state "ok"', () => {
    seedHelpful(db, PID);
    const { insights, gates } = computeEffectiveInsights(PID);
    expect(insights.map(i => i.title)).toEqual(['Use repository pattern']);
    expect(gates.state).toBe('ok');
    expect(gates.resolvedDirections).toBe(6);
    expect(gates.insightsSurfaced).toBe(1);
  });

  it('hot path reads the cache — no raw recompute on the second request', () => {
    seedHelpful(db, PID);
    const spy = vi.spyOn(brainInsightRepository, 'getForEffectiveness');

    const first = getEffectiveInsightsCached(PID);   // miss → compute + populate
    const second = getEffectiveInsightsCached(PID);   // hit → no recompute

    expect(spy).toHaveBeenCalledTimes(1);
    expect(second.insights).toEqual(first.insights);
    expect(second.gates).toEqual(first.gates);
  });

  it('cached result is identical to the inline computation (parity)', () => {
    seedHelpful(db, PID);
    const inline = computeEffectiveInsights(PID);
    getEffectiveInsightsCached(PID); // populate
    const cached = getEffectiveInsightsCached(PID);
    expect(cached.insights).toEqual(inline.insights);
    expect(cached.gates).toEqual(inline.gates);
  });

  it('refreshEffectivenessCache repopulates after new insights land', () => {
    // Start with no insights: cache says empty.
    getEffectiveInsightsCached(PID);
    expect(getEffectiveInsightsCached(PID).gates.state).toBe('empty');

    // New reflection produces a helpful insight; refresh must overwrite the cache.
    seedHelpful(db, PID);
    refreshEffectivenessCache(PID);

    const after = getEffectiveInsightsCached(PID);
    expect(after.gates.state).toBe('ok');
    expect(after.insights).toHaveLength(1);
  });
});
