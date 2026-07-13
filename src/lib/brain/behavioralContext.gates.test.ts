/**
 * Honest emptiness tests (Direction 3).
 *
 * The /api/brain/context response must let a consumer tell apart:
 *   - gated  — not enough resolved directions yet to score effectiveness
 *   - empty  — thresholds met (or no insights) but nothing proved helpful
 *   - error  — effectiveness computation failed
 *   - ok     — insights are surfaced
 *
 * The route returns getBehavioralContext() verbatim, so asserting on the
 * `gates` block of that object is asserting on the API response. hasSignals is
 * stubbed false so we exercise the (main-DB-only) no-signals branch without
 * touching hot-writes.db.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { __setTestDatabase } from '@/app/db/connection';
import { behavioralSignalRepository } from '@/app/db/repositories/behavioral-signal.repository';
import { brainInsightRepository } from '@/app/db/repositories/brain-insight.repository';
import { getBehavioralContext } from './behavioralContext';

function createTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE brain_reflections (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT NOT NULL,
      completed_at TEXT, created_at TEXT
    );
    CREATE TABLE brain_insights (
      id TEXT PRIMARY KEY, reflection_id TEXT NOT NULL, project_id TEXT NOT NULL,
      type TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
      confidence INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE directions (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE insight_effectiveness_cache (
      project_id TEXT NOT NULL, min_directions INTEGER NOT NULL DEFAULT 3,
      window_days INTEGER NOT NULL DEFAULT 90, insights_json TEXT NOT NULL,
      summary_json TEXT NOT NULL, cached_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (project_id, min_directions, window_days)
    );
    CREATE TABLE contexts ( id TEXT PRIMARY KEY, project_id TEXT, tech_stack TEXT );
  `);
}

function insertReflectionWithInsight(db: Database.Database, projectId: string) {
  const T = '2026-06-15T00:00:00.000Z';
  db.prepare(`INSERT INTO brain_reflections (id, project_id, status, completed_at, created_at) VALUES ('r1', ?, 'completed', ?, ?)`).run(projectId, T, T);
  db.prepare(`INSERT INTO brain_insights (id, reflection_id, project_id, type, title, description, confidence, created_at, updated_at) VALUES ('i1', 'r1', ?, 'recommendation', 'x', 'd', 90, ?, ?)`).run(projectId, T, T);
}

function insertDirections(db: Database.Database, projectId: string, count: number) {
  for (let i = 0; i < count; i++) {
    const day = String(10 + i).padStart(2, '0');
    db.prepare(`INSERT INTO directions (id, project_id, status, created_at) VALUES (?, ?, 'rejected', ?)`)
      .run(`d${i}`, projectId, `2026-06-${day}T00:00:00.000Z`);
  }
}

describe('behavioral context gates (honest emptiness)', () => {
  let db: Database.Database;
  const PID = 'proj-gate';

  beforeEach(() => {
    db = new Database(':memory:');
    createTables(db);
    __setTestDatabase(db);
    // No behavioral signals — exercise the main-DB-only branch.
    vi.spyOn(behavioralSignalRepository, 'hasSignals').mockReturnValue(false);
  });

  afterEach(() => {
    __setTestDatabase(null);
    db.close();
    vi.restoreAllMocks();
  });

  it('reports state "gated" with concrete numbers when directions are too few', () => {
    insertReflectionWithInsight(db, PID);
    insertDirections(db, PID, 2); // < 6 required

    const ctx = getBehavioralContext(PID);
    expect(ctx.gates).toBeDefined();
    expect(ctx.gates!.state).toBe('gated');
    expect(ctx.gates!.resolvedDirections).toBe(2);
    expect(ctx.gates!.requiredDirections).toBe(6);
    expect(ctx.topInsights).toEqual([]);
  });

  it('reports state "empty" when no insights have been learned at all', () => {
    insertDirections(db, PID, 8); // plenty of directions, but zero insights
    const ctx = getBehavioralContext(PID);
    expect(ctx.gates!.state).toBe('empty');
    expect(ctx.gates!.insightsConsidered).toBe(0);
  });

  it('reports state "error" when effectiveness computation throws', () => {
    insertReflectionWithInsight(db, PID);
    insertDirections(db, PID, 8);
    vi.spyOn(brainInsightRepository, 'getForEffectiveness').mockImplementation(() => {
      throw new Error('boom');
    });

    const ctx = getBehavioralContext(PID);
    expect(ctx.gates!.state).toBe('error');
    expect(ctx.topInsights).toEqual([]);
  });
});
