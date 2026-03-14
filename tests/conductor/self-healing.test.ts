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
import {
  savePatch,
  prunePatches,
  updatePatchStats,
  buildHealingContext,
} from '@/app/features/Manager/lib/conductor/selfHealing/promptPatcher';
import { conductorRepository } from '@/app/features/Manager/lib/conductor/conductor.repository';
import type { ErrorClassification, HealingPatch } from '@/app/features/Manager/lib/conductor/types';

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

  db.exec(`
    CREATE TABLE IF NOT EXISTS conductor_errors (
      id TEXT PRIMARY KEY,
      pipeline_run_id TEXT,
      stage TEXT NOT NULL,
      error_type TEXT NOT NULL,
      error_message TEXT,
      task_id TEXT,
      scan_type TEXT,
      occurrence_count INTEGER DEFAULT 1,
      first_seen TEXT,
      last_seen TEXT,
      resolved INTEGER DEFAULT 0,
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
  testDb.exec('DELETE FROM conductor_healing_patches');
  testDb.exec('DELETE FROM conductor_errors');
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

    it('saveClassificationsOnRun persists compact summary via repository', () => {
      testDb.prepare(
        'INSERT INTO conductor_runs (id, project_id, status) VALUES (?, ?, ?)'
      ).run('run-repo-01', 'proj-1', 'running');

      const classifications: ErrorClassification[] = [
        classifyError('timed out after 30s', 'execute', 'run-repo-01', 'task-1'),
        classifyError('file not found: foo.ts', 'execute', 'run-repo-01', 'task-2'),
      ];

      conductorRepository.saveClassificationsOnRun('run-repo-01', classifications);

      const row = testDb.prepare(
        'SELECT error_classifications FROM conductor_runs WHERE id = ?'
      ).get('run-repo-01') as { error_classifications: string };

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

    it('sets expiresAt on generated patches', async () => {
      const errors: ErrorClassification[] = [
        classifyError('file not found: src/a.ts', 'execute', 'run-heal-02d'),
        classifyError('unable to locate src/b.ts', 'execute', 'run-heal-02d'),
      ];
      let merged = [errors[0]];
      merged = mergeError(merged, errors[1]);

      const patches = await analyzeErrors(merged, 'run-heal-02d');
      expect(patches.length).toBeGreaterThanOrEqual(1);
      for (const patch of patches) {
        expect(patch.expiresAt).toBeDefined();
        const expiryDate = new Date(patch.expiresAt!);
        const sixDaysFromNow = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
        expect(expiryDate.getTime()).toBeGreaterThan(sixDaysFromNow.getTime());
      }
    });
  });

  // ============================================================================
  // HEAL-03: Bounded retry
  // ============================================================================

  describe('HEAL-03: Bounded retry', () => {
    it('tracks retry count per error class in DB', () => {
      testDb.prepare(
        'INSERT INTO conductor_runs (id, project_id, status) VALUES (?, ?, ?)'
      ).run('run-retry-01', 'proj-1', 'running');

      conductorRepository.incrementRetryCount('run-retry-01', 'timeout', 'task-a');
      conductorRepository.incrementRetryCount('run-retry-01', 'timeout', 'task-a');
      conductorRepository.incrementRetryCount('run-retry-01', 'missing_context', 'task-a');

      const timeoutCount = conductorRepository.getRetryCount('run-retry-01', 'timeout', 'task-a');
      expect(timeoutCount).toBe(1); // single row with occurrence_count=2

      const contextCount = conductorRepository.getRetryCount('run-retry-01', 'missing_context', 'task-a');
      expect(contextCount).toBe(1);
    });

    it('getRetryCount returns 0 when no retries recorded', () => {
      testDb.prepare(
        'INSERT INTO conductor_runs (id, project_id, status) VALUES (?, ?, ?)'
      ).run('run-retry-02', 'proj-1', 'running');

      const count = conductorRepository.getRetryCount('run-retry-02', 'timeout');
      expect(count).toBe(0);
    });

    it('incrementRetryCount creates new row for different taskId', () => {
      testDb.prepare(
        'INSERT INTO conductor_runs (id, project_id, status) VALUES (?, ?, ?)'
      ).run('run-retry-03', 'proj-1', 'running');

      conductorRepository.incrementRetryCount('run-retry-03', 'timeout', 'task-x');
      conductorRepository.incrementRetryCount('run-retry-03', 'timeout', 'task-y');

      const countAll = conductorRepository.getRetryCount('run-retry-03', 'timeout');
      expect(countAll).toBe(2); // two separate rows
    });
  });

  // ============================================================================
  // HEAL-04: Patch lifecycle
  // ============================================================================

  describe('HEAL-04: Patch lifecycle', () => {
    it('sets expires_at on new patches (default 7 days)', async () => {
      testDb.prepare(
        'INSERT INTO conductor_runs (id, project_id, status) VALUES (?, ?, ?)'
      ).run('run-patch-01', 'proj-1', 'running');

      const patch: HealingPatch = {
        id: 'patch-lifecycle-01',
        pipelineRunId: 'run-patch-01',
        targetType: 'prompt',
        targetId: 'test',
        originalValue: '',
        patchedValue: 'test instruction',
        reason: 'testing',
        errorPattern: 'test error',
        appliedAt: new Date().toISOString(),
        reverted: false,
      };

      await savePatch(patch);

      const row = testDb.prepare(
        'SELECT expires_at FROM conductor_healing_patches WHERE id = ?'
      ).get('patch-lifecycle-01') as { expires_at: string };

      expect(row.expires_at).toBeDefined();
      const expiryDate = new Date(row.expires_at);
      const sixDaysFromNow = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
      expect(expiryDate.getTime()).toBeGreaterThan(sixDaysFromNow.getTime());
    });

    it('prunes expired patches at pipeline start', async () => {
      testDb.prepare(
        'INSERT INTO conductor_runs (id, project_id, status) VALUES (?, ?, ?)'
      ).run('run-prune-01', 'proj-prune', 'completed');

      // Insert an expired patch
      testDb.prepare(`
        INSERT INTO conductor_healing_patches
        (id, pipeline_run_id, target_type, target_id, patched_value, reason, error_pattern, applied_at, reverted, expires_at, application_count, success_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0)
      `).run(
        'patch-expired', 'run-prune-01', 'prompt', 'test',
        'old instruction', 'stale', 'error', new Date().toISOString(),
        new Date(Date.now() - 1000).toISOString() // expired 1s ago
      );

      // Insert a valid patch
      testDb.prepare(`
        INSERT INTO conductor_healing_patches
        (id, pipeline_run_id, target_type, target_id, patched_value, reason, error_pattern, applied_at, reverted, expires_at, application_count, success_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0)
      `).run(
        'patch-valid', 'run-prune-01', 'prompt', 'test',
        'good instruction', 'valid', 'error', new Date().toISOString(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      );

      const surviving = prunePatches('proj-prune');
      expect(surviving).toHaveLength(1);
      expect(surviving[0].id).toBe('patch-valid');

      // Verify expired patch is reverted in DB
      const expiredRow = testDb.prepare(
        'SELECT reverted FROM conductor_healing_patches WHERE id = ?'
      ).get('patch-expired') as { reverted: number };
      expect(expiredRow.reverted).toBe(1);
    });

    it('auto-reverts patches with success rate below 0.3 after 3+ applications', () => {
      testDb.prepare(
        'INSERT INTO conductor_runs (id, project_id, status) VALUES (?, ?, ?)'
      ).run('run-prune-02', 'proj-prune2', 'completed');

      // Insert ineffective patch (3 applications, 0 successes = 0% success rate)
      testDb.prepare(`
        INSERT INTO conductor_healing_patches
        (id, pipeline_run_id, target_type, target_id, patched_value, reason, error_pattern, applied_at, reverted, expires_at, application_count, success_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 3, 0)
      `).run(
        'patch-ineffective', 'run-prune-02', 'prompt', 'test',
        'bad instruction', 'ineffective', 'error', new Date().toISOString(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      );

      const surviving = prunePatches('proj-prune2');
      expect(surviving).toHaveLength(0);

      const row = testDb.prepare(
        'SELECT reverted FROM conductor_healing_patches WHERE id = ?'
      ).get('patch-ineffective') as { reverted: number };
      expect(row.reverted).toBe(1);
    });

    it('increments application_count when patch stats are updated', () => {
      testDb.prepare(
        'INSERT INTO conductor_runs (id, project_id, status) VALUES (?, ?, ?)'
      ).run('run-stats-01', 'proj-stats', 'running');

      testDb.prepare(`
        INSERT INTO conductor_healing_patches
        (id, pipeline_run_id, target_type, target_id, patched_value, reason, error_pattern, applied_at, reverted, expires_at, application_count, success_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0)
      `).run(
        'patch-stats-01', 'run-stats-01', 'prompt', 'test',
        'instruction', 'testing', 'error', new Date().toISOString(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      );

      updatePatchStats('patch-stats-01', true);
      updatePatchStats('patch-stats-01', false);
      updatePatchStats('patch-stats-01', true);

      const row = testDb.prepare(
        'SELECT application_count, success_count FROM conductor_healing_patches WHERE id = ?'
      ).get('patch-stats-01') as { application_count: number; success_count: number };

      expect(row.application_count).toBe(3);
      expect(row.success_count).toBe(2);
    });

    it('buildHealingContext filters out expired patches', () => {
      const patches: HealingPatch[] = [
        {
          id: 'p1', pipelineRunId: 'r1', targetType: 'prompt', targetId: 't1',
          originalValue: '', patchedValue: 'active instruction', reason: '',
          errorPattern: '', appliedAt: '', reverted: false,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          id: 'p2', pipelineRunId: 'r1', targetType: 'prompt', targetId: 't2',
          originalValue: '', patchedValue: 'expired instruction', reason: '',
          errorPattern: '', appliedAt: '', reverted: false,
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      ];

      const context = buildHealingContext(patches);
      expect(context).toContain('active instruction');
      expect(context).not.toContain('expired instruction');
    });
  });
});
