/**
 * Conductor Run History Tests (FOUND-03)
 *
 * Validates that run history queries return correct results
 * with proper ordering, filtering, and data inclusion.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { vi } from 'vitest';

// ============================================================================
// Test database setup
// ============================================================================

const TEST_DB_PATH = path.resolve(process.cwd(), 'database', 'test-conductor-history.db');
let testDb: Database.Database;

function createTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conductor_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      goal_id TEXT,
      status TEXT NOT NULL DEFAULT 'idle',
      current_stage TEXT,
      cycle INTEGER DEFAULT 1,
      config_snapshot TEXT,
      stages_state TEXT,
      metrics TEXT,
      process_log TEXT DEFAULT '[]',
      should_abort INTEGER DEFAULT 0,
      error_message TEXT,
      queued_at TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

vi.mock('@/app/db/connection', () => ({
  getDatabase: () => testDb,
  closeDatabase: () => {},
}));

beforeAll(() => {
  const dbDir = path.dirname(TEST_DB_PATH);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  testDb = new Database(TEST_DB_PATH);
  testDb.pragma('journal_mode = WAL');
  createTables(testDb);
});

beforeEach(() => {
  testDb.exec('DELETE FROM conductor_runs');
});

afterAll(() => {
  testDb.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  try { fs.unlinkSync(TEST_DB_PATH + '-wal'); } catch {}
  try { fs.unlinkSync(TEST_DB_PATH + '-shm'); } catch {}
});

// ============================================================================
// Tests
// ============================================================================

describe('conductor run history (FOUND-03)', () => {
  it('returns empty array for project with no runs', async () => {
    const { conductorRepository } = await import(
      '@/app/features/Manager/lib/conductor/conductor.repository'
    );

    const history = conductorRepository.getRunHistory('nonexistent-project');
    expect(history).toEqual([]);
  });

  it('returns runs ordered by started_at DESC', async () => {
    const { conductorRepository } = await import(
      '@/app/features/Manager/lib/conductor/conductor.repository'
    );

    // Insert runs with different started_at times
    testDb.prepare(`INSERT INTO conductor_runs (id, project_id, status, stages_state, metrics, config_snapshot, started_at) VALUES (?, ?, 'completed', '{}', '{}', '{}', ?)`).run('run-old', 'proj-hist', '2026-01-01T00:00:00Z');
    testDb.prepare(`INSERT INTO conductor_runs (id, project_id, status, stages_state, metrics, config_snapshot, started_at) VALUES (?, ?, 'completed', '{}', '{}', '{}', ?)`).run('run-new', 'proj-hist', '2026-01-02T00:00:00Z');
    testDb.prepare(`INSERT INTO conductor_runs (id, project_id, status, stages_state, metrics, config_snapshot, started_at) VALUES (?, ?, 'completed', '{}', '{}', '{}', ?)`).run('run-mid', 'proj-hist', '2026-01-01T12:00:00Z');

    const history = conductorRepository.getRunHistory('proj-hist');
    expect(history).toHaveLength(3);
    expect(history[0].id).toBe('run-new');
    expect(history[1].id).toBe('run-mid');
    expect(history[2].id).toBe('run-old');
  });

  it('includes metrics and stage data in history', async () => {
    const { conductorRepository } = await import(
      '@/app/features/Manager/lib/conductor/conductor.repository'
    );

    const metrics = JSON.stringify({ ideasGenerated: 10, tasksCompleted: 3, totalDurationMs: 5000 });
    const stages = JSON.stringify({ scout: { status: 'completed', itemsOut: 5 } });

    testDb.prepare(`INSERT INTO conductor_runs (id, project_id, status, stages_state, metrics, config_snapshot, started_at) VALUES (?, ?, 'completed', ?, ?, '{}', ?)`).run('run-data', 'proj-data', stages, metrics, '2026-01-01T00:00:00Z');

    const history = conductorRepository.getRunHistory('proj-data');
    expect(history).toHaveLength(1);
    expect(history[0].metrics.ideasGenerated).toBe(10);
    expect(history[0].stages.scout.status).toBe('completed');
  });

  it('respects limit parameter', async () => {
    const { conductorRepository } = await import(
      '@/app/features/Manager/lib/conductor/conductor.repository'
    );

    // Insert 5 runs
    for (let i = 0; i < 5; i++) {
      testDb.prepare(`INSERT INTO conductor_runs (id, project_id, status, stages_state, metrics, config_snapshot, started_at) VALUES (?, ?, 'completed', '{}', '{}', '{}', ?)`).run(`run-limit-${i}`, 'proj-limit', `2026-01-0${i + 1}T00:00:00Z`);
    }

    const limited = conductorRepository.getRunHistory('proj-limit', 3);
    expect(limited).toHaveLength(3);
  });
});
