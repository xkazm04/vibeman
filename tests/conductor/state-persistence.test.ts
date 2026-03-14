/**
 * Conductor State Persistence Tests (FOUND-01)
 *
 * Validates that pipeline runs are persisted to SQLite and
 * that recovery correctly marks interrupted runs.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { vi } from 'vitest';

// ============================================================================
// Test database setup
// ============================================================================

const TEST_DB_PATH = path.resolve(process.cwd(), 'database', 'test-conductor-persistence.db');
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

describe('conductor state persistence (FOUND-01)', () => {
  it('creates a pipeline run in SQLite', async () => {
    const { conductorRepository } = await import(
      '@/app/features/Manager/lib/conductor/conductor.repository'
    );

    const run = conductorRepository.createRun({
      id: 'run-001',
      projectId: 'proj-1',
      goalId: 'goal-1',
      config: { maxCyclesPerRun: 3 } as any,
    });

    expect(run).toBeDefined();
    expect(run.id).toBe('run-001');
    expect(run.project_id).toBe('proj-1');
    expect(run.goal_id).toBe('goal-1');
    expect(run.status).toBe('running');
  });

  it('persists stage completion to DB', async () => {
    const { conductorRepository } = await import(
      '@/app/features/Manager/lib/conductor/conductor.repository'
    );

    conductorRepository.createRun({
      id: 'run-002',
      projectId: 'proj-1',
      goalId: 'goal-1',
      config: {} as any,
    });

    conductorRepository.completeStage('run-002', 'scout', {
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:01:00Z',
      itemsIn: 0,
      itemsOut: 5,
    });

    const fetched = conductorRepository.getRunById('run-002');
    expect(fetched).toBeDefined();
    expect(fetched!.stages.scout.status).toBe('completed');
    expect(fetched!.stages.scout.itemsOut).toBe(5);
    expect(fetched!.current_stage).toBe('scout');
  });

  it('marks interrupted runs on recovery', async () => {
    const { conductorRepository } = await import(
      '@/app/features/Manager/lib/conductor/conductor.repository'
    );

    // Create two runs in running/paused states
    conductorRepository.createRun({
      id: 'run-orphan-1',
      projectId: 'proj-1',
      goalId: 'goal-1',
      config: {} as any,
    });
    // Simulate a paused run
    conductorRepository.updateRunStatus('run-orphan-2-setup', 'running');
    testDb.prepare(`INSERT INTO conductor_runs (id, project_id, status, stages_state, metrics, config_snapshot) VALUES (?, ?, 'paused', '{}', '{}', '{}')`).run('run-orphan-2', 'proj-1');

    // Reset the guard so markInterruptedRuns can run
    (globalThis as any).__conductorRecoveryDone = false;

    const count = conductorRepository.markInterruptedRuns();
    expect(count).toBeGreaterThanOrEqual(2);

    const r1 = conductorRepository.getRunById('run-orphan-1');
    const r2 = conductorRepository.getRunById('run-orphan-2');
    expect(r1!.status).toBe('interrupted');
    expect(r2!.status).toBe('interrupted');
  });

  it('does not corrupt other runs during recovery', async () => {
    const { conductorRepository } = await import(
      '@/app/features/Manager/lib/conductor/conductor.repository'
    );

    // Insert a completed run
    testDb.prepare(`INSERT INTO conductor_runs (id, project_id, status, stages_state, metrics, config_snapshot) VALUES (?, ?, 'completed', '{}', '{}', '{}')`).run('run-safe', 'proj-1');
    // Insert a running run
    testDb.prepare(`INSERT INTO conductor_runs (id, project_id, status, stages_state, metrics, config_snapshot) VALUES (?, ?, 'running', '{}', '{}', '{}')`).run('run-orphan-3', 'proj-1');

    (globalThis as any).__conductorRecoveryDone = false;
    conductorRepository.markInterruptedRuns();

    const safe = conductorRepository.getRunById('run-safe');
    expect(safe!.status).toBe('completed');

    const orphan = conductorRepository.getRunById('run-orphan-3');
    expect(orphan!.status).toBe('interrupted');
  });
});
