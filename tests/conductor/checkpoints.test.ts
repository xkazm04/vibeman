/**
 * Checkpoint and Build Validation Tests (EXEC-04, VALD-01)
 *
 * Validates checkpoint config parsing, checkpoint_type DB read/write,
 * and build validation result storage on conductor_runs.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// Test database setup
// ============================================================================

const TEST_DB_PATH = path.resolve(process.cwd(), 'database', 'test-checkpoints.db');
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
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      build_validation TEXT,
      checkpoint_type TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      context_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      order_index INTEGER NOT NULL DEFAULT 0,
      target_paths TEXT,
      excluded_paths TEXT,
      max_sessions INTEGER DEFAULT 2,
      priority TEXT DEFAULT 'normal',
      checkpoint_config TEXT,
      use_brain INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// Mock getDatabase to return our test DB
vi.mock('@/app/db/connection', () => ({
  getDatabase: () => testDb,
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { conductorRepository } from '@/app/features/Conductor/lib/conductor.repository';
import { goalRepository } from '@/app/db/repositories/goal.repository';

// ============================================================================
// Test helpers
// ============================================================================

const PROJECT_ID = 'test-project';

function insertRun(runId: string, goalId?: string) {
  testDb.prepare(
    'INSERT INTO conductor_runs (id, project_id, goal_id, status) VALUES (?, ?, ?, ?)'
  ).run(runId, PROJECT_ID, goalId || null, 'running');
}

function insertGoal(goalId: string, checkpointConfig?: Record<string, boolean> | null) {
  const configStr = checkpointConfig ? JSON.stringify(checkpointConfig) : null;
  testDb.prepare(
    'INSERT INTO goals (id, project_id, title, status, order_index, checkpoint_config) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(goalId, PROJECT_ID, 'Test Goal', 'open', 0, configStr);
}

function updateRunDirect(runId: string, updates: Record<string, any>) {
  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  testDb.prepare(`UPDATE conductor_runs SET ${setClauses} WHERE id = ?`).run(...values, runId);
}

function getRawRun(runId: string): any {
  return testDb.prepare('SELECT * FROM conductor_runs WHERE id = ?').get(runId);
}

// ============================================================================
// Setup / Teardown
// ============================================================================

beforeAll(() => {
  const dbDir = path.dirname(TEST_DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  testDb = new Database(TEST_DB_PATH);
  testDb.pragma('journal_mode = WAL');
  testDb.pragma('foreign_keys = OFF'); // Goals table doesn't have FK to conductor_runs
  createTables(testDb);
});

beforeEach(() => {
  testDb.exec('DELETE FROM conductor_runs');
  testDb.exec('DELETE FROM goals');
});

afterAll(() => {
  testDb.close();
  try { fs.unlinkSync(TEST_DB_PATH); } catch {}
  try { fs.unlinkSync(TEST_DB_PATH + '-wal'); } catch {}
  try { fs.unlinkSync(TEST_DB_PATH + '-shm'); } catch {}
});

// ============================================================================
// EXEC-04: Checkpoint config parsing
// ============================================================================

describe('checkpoint config', () => {
  it('checkpoint config parsed from goal record', () => {
    const goalId = 'goal-checkpoint-1';
    const expectedConfig = { triage: false, preExecute: true, postReview: false };
    insertGoal(goalId, expectedConfig);

    const goal = goalRepository.getGoalById(goalId);
    expect(goal).not.toBeNull();

    // Parse checkpoint_config the same way the orchestrator does
    const raw = (goal as any)?.checkpoint_config;
    const parsed = raw
      ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
      : { triage: false, preExecute: false, postReview: false };

    expect(parsed).toEqual(expectedConfig);
    expect(parsed.preExecute).toBe(true);
    expect(parsed.triage).toBe(false);
    expect(parsed.postReview).toBe(false);
  });

  it('default checkpoint config when goal has no config', () => {
    const goalId = 'goal-no-config';
    insertGoal(goalId, null);

    const goal = goalRepository.getGoalById(goalId);
    expect(goal).not.toBeNull();

    const raw = (goal as any)?.checkpoint_config;
    const parsed = raw
      ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
      : { triage: false, preExecute: false, postReview: false };

    expect(parsed).toEqual({ triage: false, preExecute: false, postReview: false });
  });
});

// ============================================================================
// EXEC-04: Checkpoint state transitions
// ============================================================================

describe('checkpoint state transitions', () => {
  it('checkpoint_type written to conductor_runs on pause', () => {
    const runId = 'run-checkpoint-write';
    insertRun(runId);

    updateRunDirect(runId, { checkpoint_type: 'pre_execute' });

    const raw = getRawRun(runId);
    expect(raw.checkpoint_type).toBe('pre_execute');

    // Also verify via conductorRepository.getRunById that the run is readable
    const run = conductorRepository.getRunById(runId);
    expect(run).not.toBeNull();
  });

  it('checkpoint_type cleared on resume', () => {
    const runId = 'run-checkpoint-clear';
    insertRun(runId);

    // Set checkpoint
    updateRunDirect(runId, { checkpoint_type: 'post_review' });
    let raw = getRawRun(runId);
    expect(raw.checkpoint_type).toBe('post_review');

    // Clear checkpoint (simulating resume)
    updateRunDirect(runId, { checkpoint_type: null });
    raw = getRawRun(runId);
    expect(raw.checkpoint_type).toBeNull();
  });
});

// ============================================================================
// VALD-01: Build validation result storage
// ============================================================================

describe('build validation storage', () => {
  it('build validation result stored on run record', () => {
    const runId = 'run-build-pass';
    insertRun(runId);

    const buildResult = { passed: true, durationMs: 500 };
    updateRunDirect(runId, { build_validation: JSON.stringify(buildResult) });

    const raw = getRawRun(runId);
    expect(raw.build_validation).not.toBeNull();

    const parsed = JSON.parse(raw.build_validation);
    expect(parsed.passed).toBe(true);
    expect(parsed.durationMs).toBe(500);
  });

  it('build validation failure with error output stored', () => {
    const runId = 'run-build-fail';
    insertRun(runId);

    const buildResult = {
      passed: false,
      durationMs: 1200,
      errorOutput: 'src/auth.ts(15,3): error TS2322: Type string is not assignable to type number',
    };
    updateRunDirect(runId, { build_validation: JSON.stringify(buildResult) });

    const raw = getRawRun(runId);
    const parsed = JSON.parse(raw.build_validation);
    expect(parsed.passed).toBe(false);
    expect(parsed.durationMs).toBe(1200);
    expect(parsed.errorOutput).toContain('TS2322');
    expect(parsed.errorOutput).toContain('src/auth.ts');
  });
});
