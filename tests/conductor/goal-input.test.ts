/**
 * Goal Input Tests (GOAL-01)
 *
 * Validates that goals can be created with all constraint fields
 * and that defaults are applied correctly.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { vi } from 'vitest';

// ============================================================================
// Test database setup
// ============================================================================

const TEST_DB_PATH = path.resolve(process.cwd(), 'database', 'test-goal-input.db');
let testDb: Database.Database;

function createTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      context_id TEXT,
      order_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'done', 'rejected', 'undecided')),
      progress INTEGER DEFAULT 0,
      hypotheses_total INTEGER DEFAULT 0,
      hypotheses_verified INTEGER DEFAULT 0,
      target_date TEXT,
      started_at TEXT,
      completed_at TEXT,
      github_item_id TEXT,
      target_paths TEXT,
      excluded_paths TEXT,
      max_sessions INTEGER DEFAULT 2,
      priority TEXT DEFAULT 'normal',
      checkpoint_config TEXT,
      use_brain INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  testDb.exec('DELETE FROM goals');
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

describe('goal input (GOAL-01)', () => {
  it('creates goal with all constraint fields', async () => {
    const { goalRepository } = await import('@/app/db/repositories/goal.repository');

    const goal = goalRepository.createGoal({
      id: 'goal-c1',
      project_id: 'proj-1',
      title: 'Test Goal',
      description: 'A test goal',
      status: 'open',
      order_index: 0,
      target_paths: ['src/lib/', 'src/api/'],
      excluded_paths: ['node_modules/'],
      max_sessions: 4,
      priority: 'high',
      checkpoint_config: { triage: true, preExecute: false, postReview: true },
      use_brain: true,
    });

    expect(goal).toBeDefined();
    expect(goal.id).toBe('goal-c1');

    // Verify by reading raw DB to check serialization
    const raw = testDb.prepare('SELECT target_paths, excluded_paths, max_sessions, priority, checkpoint_config, use_brain FROM goals WHERE id = ?').get('goal-c1') as any;
    expect(JSON.parse(raw.target_paths)).toEqual(['src/lib/', 'src/api/']);
    expect(JSON.parse(raw.excluded_paths)).toEqual(['node_modules/']);
    expect(raw.max_sessions).toBe(4);
    expect(raw.priority).toBe('high');
    expect(JSON.parse(raw.checkpoint_config)).toEqual({ triage: true, preExecute: false, postReview: true });
    expect(raw.use_brain).toBe(1);
  });

  it('constraint fields default correctly when omitted', async () => {
    const { goalRepository } = await import('@/app/db/repositories/goal.repository');

    goalRepository.createGoal({
      id: 'goal-c2',
      project_id: 'proj-1',
      title: 'Minimal Goal',
      status: 'open',
      order_index: 1,
    });

    const raw = testDb.prepare('SELECT max_sessions, priority, use_brain FROM goals WHERE id = ?').get('goal-c2') as any;
    // DB defaults: max_sessions=2, priority='normal', use_brain=1
    expect(raw.max_sessions).toBe(2);
    expect(raw.priority).toBe('normal');
    expect(raw.use_brain).toBe(1);
  });

  it('checkpoint_config serializes and deserializes as JSON', async () => {
    const { goalRepository } = await import('@/app/db/repositories/goal.repository');

    const checkpointConfig = { triage: false, preExecute: true, postReview: false };

    goalRepository.createGoal({
      id: 'goal-c3',
      project_id: 'proj-1',
      title: 'Checkpoint Goal',
      status: 'open',
      order_index: 2,
      checkpoint_config: checkpointConfig,
    });

    // Read back via repository
    const fetched = goalRepository.getGoalById('goal-c3');
    expect(fetched).toBeDefined();

    // Read raw to confirm JSON storage
    const raw = testDb.prepare('SELECT checkpoint_config FROM goals WHERE id = ?').get('goal-c3') as any;
    expect(JSON.parse(raw.checkpoint_config)).toEqual(checkpointConfig);
  });
});
