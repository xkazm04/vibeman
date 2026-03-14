/**
 * Self-Healing Pipeline Tests (HEAL-01 through HEAL-04)
 *
 * Validates error classification, healing suggestions,
 * bounded retry, and patch lifecycle tracking.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { vi } from 'vitest';

import {
  classifyError,
  detectErrorType,
  groupErrorsByType,
  mergeError,
} from '@/app/features/Manager/lib/conductor/selfHealing/errorClassifier';
import { analyzeErrors } from '@/app/features/Manager/lib/conductor/selfHealing/healingAnalyzer';
import type { ErrorClassification } from '@/app/features/Manager/lib/conductor/types';

// ============================================================================
// Test database setup
// ============================================================================

const TEST_DB_PATH = path.resolve(process.cwd(), 'database', 'test-self-healing.db');
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
      created_at TEXT DEFAULT (datetime('now')),
      error_classifications TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS conductor_healing_patches (
      id TEXT PRIMARY KEY,
      pipeline_run_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      original_value TEXT,
      patched_value TEXT,
      reason TEXT,
      error_pattern TEXT,
      applied_at TEXT,
      effectiveness REAL,
      reverted INTEGER DEFAULT 0,
      expires_at TEXT,
      application_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0
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
  testDb.exec('DELETE FROM conductor_healing_patches');
});

afterAll(() => {
  testDb.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  try { fs.unlinkSync(TEST_DB_PATH + '-wal'); } catch {}
  try { fs.unlinkSync(TEST_DB_PATH + '-shm'); } catch {}
});

// ============================================================================
// HEAL-01: Error classification visibility
// ============================================================================

describe('Self-Healing Pipeline', () => {

  describe('HEAL-01: Error classification visibility', () => {
    it('classifies syntax errors as invalid_output', () => {
      const result = detectErrorType('parse error: unexpected token at line 5');
      expect(result).toBe('invalid_output');
    });

    it('classifies timeout errors as timeout', () => {
      const result = detectErrorType('process timed out after 60 seconds');
      expect(result).toBe('timeout');
    });

    it('stores classification summary on run record as JSON', () => {
      const classification = classifyError(
        'file not found: src/missing.ts',
        'execute',
        'run-heal-01'
      );
      const summary = JSON.stringify([{
        errorType: classification.errorType,
        stage: classification.stage,
        occurrenceCount: classification.occurrenceCount,
      }]);

      testDb.prepare(
        'INSERT INTO conductor_runs (id, project_id, status, error_classifications) VALUES (?, ?, ?, ?)'
      ).run('run-heal-01', 'proj-1', 'failed', summary);

      const row = testDb.prepare(
        'SELECT error_classifications FROM conductor_runs WHERE id = ?'
      ).get('run-heal-01') as { error_classifications: string };

      const parsed = JSON.parse(row.error_classifications);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].errorType).toBe('missing_context');
    });

    it('classification is queryable from conductor_runs table', () => {
      const classifications = JSON.stringify([
        { errorType: 'timeout', stage: 'execute', occurrenceCount: 3 },
        { errorType: 'missing_context', stage: 'scout', occurrenceCount: 1 },
      ]);

      testDb.prepare(
        'INSERT INTO conductor_runs (id, project_id, status, error_classifications) VALUES (?, ?, ?, ?)'
      ).run('run-query-01', 'proj-1', 'failed', classifications);

      const row = testDb.prepare(
        'SELECT error_classifications FROM conductor_runs WHERE id = ?'
      ).get('run-query-01') as { error_classifications: string };

      const parsed = JSON.parse(row.error_classifications);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].errorType).toBe('timeout');
      expect(parsed[1].errorType).toBe('missing_context');
    });
  });

  // ============================================================================
  // HEAL-02: Healing suggestions
  // ============================================================================

  describe('HEAL-02: Healing suggestions', () => {
    it('generates prompt patch for missing_context errors', async () => {
      const errors: ErrorClassification[] = [
        classifyError('file not found: src/utils.ts', 'execute', 'run-heal-02'),
        classifyError('cannot find module src/helpers.ts', 'execute', 'run-heal-02'),
      ];
      // Merge to get occurrence count >= 2
      let merged = [errors[0]];
      merged = mergeError(merged, errors[1]);

      const patches = await analyzeErrors(merged, 'run-heal-02');
      expect(patches.length).toBeGreaterThanOrEqual(1);
      expect(patches[0].targetType).toBe('prompt');
    });

    it('generates config patch for timeout errors', async () => {
      const errors: ErrorClassification[] = [
        classifyError('process timed out after 120s', 'execute', 'run-heal-02b'),
        classifyError('exceeded time limit 180s', 'execute', 'run-heal-02b'),
      ];
      let merged = [errors[0]];
      merged = mergeError(merged, errors[1]);

      const patches = await analyzeErrors(merged, 'run-heal-02b');
      expect(patches.length).toBeGreaterThanOrEqual(1);
      // Timeout healing produces both config and prompt patches
      const hasConfig = patches.some(p => p.targetType === 'config');
      expect(hasConfig).toBe(true);
    });

    it('skips healing for single-occurrence errors', async () => {
      const errors: ErrorClassification[] = [
        classifyError('some random error', 'execute', 'run-heal-02c'),
      ];

      const patches = await analyzeErrors(errors, 'run-heal-02c');
      expect(patches).toHaveLength(0);
    });
  });

  // ============================================================================
  // HEAL-03: Bounded retry
  // ============================================================================

  describe('HEAL-03: Bounded retry', () => {
    // TODO: import bounded retry functions from Plan 02 implementation
    it.skip('retries failed task up to MAX_RETRIES times', () => {
      // Will test that a failed task is retried up to the configured max
    });

    it.skip('stops retrying after MAX_RETRIES exceeded', () => {
      // Will test that retry stops after limit and marks task as permanently failed
    });

    it.skip('tracks retry count per error class in DB', () => {
      // Will test that each retry increments a counter stored in the DB
    });
  });

  // ============================================================================
  // HEAL-04: Patch lifecycle
  // ============================================================================

  describe('HEAL-04: Patch lifecycle', () => {
    // TODO: import patch lifecycle functions from Plan 02 implementation
    it.skip('sets expires_at on new patches (default 7 days)', () => {
      // Will test that newly created patches get an expires_at 7 days in the future
    });

    it.skip('prunes expired patches at pipeline start', () => {
      // Will test that expired patches are removed before a new pipeline run
    });

    it.skip('computes success rate from application_count and success_count', () => {
      // Will test success_count / application_count calculation
    });

    it.skip('auto-reverts patches with success rate below 0.3 after 3+ applications', () => {
      // Will test that ineffective patches (< 30% success after 3+ uses) are reverted
    });

    it.skip('increments application_count when patch is active during a run', () => {
      // Will test that application_count increments each time a patch is used
    });
  });
});
