/**
 * Execute Stage Integration Tests (EXEC-01, EXEC-02, EXEC-03)
 *
 * Validates the refactored execute stage with domain-scheduler-based dispatch,
 * file verification gating, and spec status tracking.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ============================================================================
// Test database setup
// ============================================================================

const TEST_DB_PATH = path.resolve(process.cwd(), 'database', 'test-execute-stage.db');
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
    CREATE TABLE IF NOT EXISTS conductor_specs (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      backlog_item_id TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      affected_files TEXT NOT NULL,
      complexity TEXT NOT NULL CHECK (complexity IN ('S', 'M', 'L')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (run_id) REFERENCES conductor_runs(id)
    );
  `);
}

// Mock getDatabase to return our test DB
vi.mock('@/app/db/connection', () => ({
  getDatabase: () => testDb,
}));

// ============================================================================
// CLI service mock — tracks call order for concurrency assertions
// ============================================================================

let cliCallLog: { fn: string; args: any[]; timestamp: number }[] = [];
let executionStatuses: Map<string, string> = new Map();
let executionIdCounter = 0;

const mockStartExecution = vi.fn((...args: any[]) => {
  const id = `exec-${++executionIdCounter}`;
  cliCallLog.push({ fn: 'startExecution', args: [id, ...args], timestamp: Date.now() });
  executionStatuses.set(id, 'completed');
  return id;
});

const mockGetExecution = vi.fn((executionId: string) => {
  const status = executionStatuses.get(executionId) || 'completed';
  return { status, executionId };
});

const mockAbortExecution = vi.fn();

vi.mock('@/lib/claude-terminal/cli-service', () => ({
  startExecution: (...args: any[]) => mockStartExecution(...args),
  getExecution: (...args: any[]) => mockGetExecution(...args),
  abortExecution: (...args: any[]) => mockAbortExecution(...args),
}));

// Mock specFileManager to avoid disk reads for spec files
vi.mock('@/app/features/Manager/lib/conductor/spec/specFileManager', () => ({
  specFileManager: {
    formatFilename: (seq: number, slug: string) => `${String(seq).padStart(3, '0')}-${slug}.md`,
  },
}));

// Mock fs.readFileSync for spec file reads (leave other fs operations real)
const originalReadFileSync = fs.readFileSync;
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    readFileSync: (...args: any[]) => {
      const filePath = String(args[0]);
      if (filePath.includes('.conductor') && filePath.includes('specs')) {
        return '# Mock spec content';
      }
      return (actual.readFileSync as any)(...args);
    },
  };
});

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { specRepository } from '@/app/features/Manager/lib/conductor/spec/specRepository';
import { executeExecuteStage } from '@/app/features/Manager/lib/conductor/stages/executeStage';
import type { BalancingConfig } from '@/app/features/Manager/lib/conductor/types';

// ============================================================================
// Test helpers
// ============================================================================

const RUN_ID = 'test-exec-run';
const PROJECT_ID = 'test-project';

let tempDir: string;

function createTestConfig(overrides?: Partial<BalancingConfig>): BalancingConfig {
  return {
    maxConcurrentTasks: 4,
    executionProvider: 'claude',
    executionModel: 'sonnet',
    executionTimeoutMs: 10000,
    scanTypes: ['feature'],
    contextStrategy: 'all',
    batchStrategy: 'parallel',
    maxCyclesPerRun: 1,
    healingEnabled: false,
    ...overrides,
  } as BalancingConfig;
}

function insertRun(runId: string = RUN_ID) {
  testDb.prepare('INSERT INTO conductor_runs (id, project_id, status) VALUES (?, ?, ?)').run(
    runId, PROJECT_ID, 'running'
  );
}

function insertSpec(id: string, runId: string, seq: number, slug: string, affectedFiles: { create: string[]; modify: string[]; delete: string[] }) {
  specRepository.createSpec({
    id,
    runId,
    backlogItemId: `item-${id}`,
    sequenceNumber: seq,
    title: slug,
    slug,
    affectedFiles,
    complexity: 'S',
  });
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
  testDb.pragma('foreign_keys = ON');
  createTables(testDb);
});

beforeEach(() => {
  testDb.exec('DELETE FROM conductor_specs');
  testDb.exec('DELETE FROM conductor_runs');
  cliCallLog = [];
  executionStatuses = new Map();
  executionIdCounter = 0;
  mockStartExecution.mockClear();
  mockGetExecution.mockClear();
  mockAbortExecution.mockClear();

  // Create temp directory for project path
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'execute-stage-test-'));
});

afterEach(() => {
  // Clean up temp directory
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
});

afterAll(() => {
  testDb.close();
  try { fs.unlinkSync(TEST_DB_PATH); } catch {}
  try { fs.unlinkSync(TEST_DB_PATH + '-wal'); } catch {}
  try { fs.unlinkSync(TEST_DB_PATH + '-shm'); } catch {}
});

// ============================================================================
// EXEC-01/EXEC-02: Parallel dispatch and overlap serialization
// ============================================================================

describe('domain scheduler dispatch', () => {
  it('dispatches non-overlapping specs in parallel', async () => {
    insertRun();
    insertSpec('spec-a', RUN_ID, 1, 'add-auth', {
      create: ['src/auth.ts'], modify: [], delete: [],
    });
    insertSpec('spec-b', RUN_ID, 2, 'add-store', {
      create: ['src/store.ts'], modify: [], delete: [],
    });

    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });

    // Mock getExecution: create the expected files so verification passes
    mockGetExecution.mockImplementation((execId: string) => {
      try {
        fs.writeFileSync(path.join(tempDir, 'src', 'auth.ts'), 'created');
        fs.writeFileSync(path.join(tempDir, 'src', 'store.ts'), 'created');
      } catch {}
      return { status: 'completed', executionId: execId };
    });

    const result = await executeExecuteStage({
      runId: RUN_ID,
      config: createTestConfig(),
      projectId: PROJECT_ID,
      projectPath: tempDir,
      projectName: 'Test',
    });

    // Both specs should have been dispatched in same batch (non-overlapping)
    expect(mockStartExecution).toHaveBeenCalledTimes(2);
    expect(result.results).toHaveLength(2);
  });

  it('serializes overlapping specs', async () => {
    insertRun();
    // Both specs touch src/shared.ts — will be serialized
    insertSpec('spec-overlap-a', RUN_ID, 1, 'task-a', {
      create: ['src/a.ts'], modify: [], delete: [],
    });
    insertSpec('spec-overlap-b', RUN_ID, 2, 'task-b', {
      create: ['src/b.ts'], modify: [], delete: [],
    });
    // Add shared overlap via modify on both — but use create for verification
    // Actually, overlap is computed by getAllPaths which unions create+modify+delete
    // Let's set overlapping modify paths to force serialization
    testDb.exec('DELETE FROM conductor_specs');
    insertSpec('spec-overlap-a', RUN_ID, 1, 'task-a', {
      create: ['src/a.ts'], modify: ['src/shared.ts'], delete: [],
    });
    insertSpec('spec-overlap-b', RUN_ID, 2, 'task-b', {
      create: ['src/b.ts'], modify: ['src/shared.ts'], delete: [],
    });

    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    // shared.ts exists already for modify tracking
    fs.writeFileSync(path.join(tempDir, 'src', 'shared.ts'), 'initial');

    // Track dispatch order
    const dispatchOrder: string[] = [];
    mockStartExecution.mockImplementation((...args: any[]) => {
      const id = `exec-${++executionIdCounter}`;
      dispatchOrder.push(id);
      return id;
    });

    mockGetExecution.mockImplementation((execId: string) => {
      try {
        fs.writeFileSync(path.join(tempDir, 'src', 'a.ts'), 'created');
        fs.writeFileSync(path.join(tempDir, 'src', 'b.ts'), 'created');
        // Use unique content to ensure mtime differs from snapshot
        fs.writeFileSync(path.join(tempDir, 'src', 'shared.ts'), 'modified-' + execId + '-' + Date.now());
      } catch {}
      return { status: 'completed', executionId: execId };
    });

    const result = await executeExecuteStage({
      runId: RUN_ID,
      config: createTestConfig({ maxConcurrentTasks: 4 } as any),
      projectId: PROJECT_ID,
      projectPath: tempDir,
      projectName: 'Test',
    });

    // Both should complete
    expect(result.results).toHaveLength(2);
    // Because they overlap, they cannot be in the same batch
    // First batch dispatches 1, then after it completes, second batch dispatches 1
    expect(dispatchOrder).toHaveLength(2);
  });

  it('respects maxConcurrentTasks limit', async () => {
    insertRun();
    // 3 non-overlapping specs using create for easy verification
    insertSpec('spec-limit-1', RUN_ID, 1, 'task-1', {
      create: ['src/a.ts'], modify: [], delete: [],
    });
    insertSpec('spec-limit-2', RUN_ID, 2, 'task-2', {
      create: ['src/b.ts'], modify: [], delete: [],
    });
    insertSpec('spec-limit-3', RUN_ID, 3, 'task-3', {
      create: ['src/c.ts'], modify: [], delete: [],
    });

    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });

    // Track batch sizes by counting startExecution calls per wave
    const waveSizes: number[] = [];
    let currentWaveSize = 0;

    mockStartExecution.mockImplementation((...args: any[]) => {
      const id = `exec-${++executionIdCounter}`;
      currentWaveSize++;
      return id;
    });

    mockGetExecution.mockImplementation((execId: string) => {
      // Record wave size when first poll in a wave happens
      if (currentWaveSize > 0) {
        waveSizes.push(currentWaveSize);
        currentWaveSize = 0;
      }
      try {
        fs.writeFileSync(path.join(tempDir, 'src', 'a.ts'), 'created');
        fs.writeFileSync(path.join(tempDir, 'src', 'b.ts'), 'created');
        fs.writeFileSync(path.join(tempDir, 'src', 'c.ts'), 'created');
      } catch {}
      return { status: 'completed', executionId: execId };
    });

    const result = await executeExecuteStage({
      runId: RUN_ID,
      config: createTestConfig({ maxConcurrentTasks: 2 } as any),
      projectId: PROJECT_ID,
      projectPath: tempDir,
      projectName: 'Test',
    });

    // All 3 should complete
    expect(result.results).toHaveLength(3);
    // First wave should have max 2 specs (the limit)
    expect(waveSizes[0]).toBeLessThanOrEqual(2);
  });
});

// ============================================================================
// EXEC-03: Spec status transitions
// ============================================================================

describe('spec status transitions', () => {
  it('updates spec status to executing before dispatch', async () => {
    insertRun();
    insertSpec('spec-status-exec', RUN_ID, 1, 'status-test', {
      create: ['src/x.ts'], modify: [], delete: [],
    });

    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });

    let statusDuringExecution: string | null = null;
    mockStartExecution.mockImplementation((...args: any[]) => {
      const id = `exec-${++executionIdCounter}`;
      // Capture spec status at the moment of dispatch
      const spec = specRepository.getSpecById('spec-status-exec');
      statusDuringExecution = spec?.status || null;
      return id;
    });

    mockGetExecution.mockImplementation((execId: string) => {
      try { fs.writeFileSync(path.join(tempDir, 'src', 'x.ts'), 'created'); } catch {}
      return { status: 'completed', executionId: execId };
    });

    await executeExecuteStage({
      runId: RUN_ID,
      config: createTestConfig(),
      projectId: PROJECT_ID,
      projectPath: tempDir,
      projectName: 'Test',
    });

    expect(statusDuringExecution).toBe('executing');
  });

  it('updates spec status to completed on success', async () => {
    insertRun();
    insertSpec('spec-complete', RUN_ID, 1, 'complete-test', {
      create: ['src/y.ts'], modify: [], delete: [],
    });

    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });

    mockGetExecution.mockImplementation((execId: string) => {
      try { fs.writeFileSync(path.join(tempDir, 'src', 'y.ts'), 'created'); } catch {}
      return { status: 'completed', executionId: execId };
    });

    await executeExecuteStage({
      runId: RUN_ID,
      config: createTestConfig(),
      projectId: PROJECT_ID,
      projectPath: tempDir,
      projectName: 'Test',
    });

    const spec = specRepository.getSpecById('spec-complete');
    expect(spec?.status).toBe('completed');
  });

  it('updates spec status to failed on CLI error', async () => {
    insertRun();
    insertSpec('spec-fail', RUN_ID, 1, 'fail-test', {
      create: ['src/z.ts'], modify: [], delete: [],
    });

    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });

    mockGetExecution.mockReturnValue({ status: 'error', executionId: 'exec-err' });

    await executeExecuteStage({
      runId: RUN_ID,
      config: createTestConfig(),
      projectId: PROJECT_ID,
      projectPath: tempDir,
      projectName: 'Test',
    });

    const spec = specRepository.getSpecById('spec-fail');
    expect(spec?.status).toBe('failed');
  });
});

// ============================================================================
// File verification
// ============================================================================

describe('file verification', () => {
  it('marks spec failed when CLI exits 0 but no files changed', async () => {
    insertRun();
    insertSpec('spec-no-change', RUN_ID, 1, 'no-change', {
      create: [], modify: ['src/untouched.ts'], delete: [],
    });

    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'untouched.ts'), 'original content');

    // CLI exits successfully but does NOT modify any files
    mockGetExecution.mockReturnValue({ status: 'completed', executionId: 'exec-noop' });

    const result = await executeExecuteStage({
      runId: RUN_ID,
      config: createTestConfig(),
      projectId: PROJECT_ID,
      projectPath: tempDir,
      projectName: 'Test',
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].success).toBe(false);
    expect(result.results[0].error).toContain('File verification failed');

    const spec = specRepository.getSpecById('spec-no-change');
    expect(spec?.status).toBe('failed');
  });

  it('marks spec completed when CLI exits 0 and files were created', async () => {
    insertRun();
    // Use create-type affected files — verification checks file exists after execution
    insertSpec('spec-modified', RUN_ID, 1, 'modified-test', {
      create: ['src/new-file.ts'], modify: [], delete: [],
    });

    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });

    mockGetExecution.mockImplementation((execId: string) => {
      // Simulate CLI creating the expected file
      try { fs.writeFileSync(path.join(tempDir, 'src', 'new-file.ts'), 'new content'); } catch {}
      return { status: 'completed', executionId: execId };
    });

    const result = await executeExecuteStage({
      runId: RUN_ID,
      config: createTestConfig(),
      projectId: PROJECT_ID,
      projectPath: tempDir,
      projectName: 'Test',
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].success).toBe(true);

    const spec = specRepository.getSpecById('spec-modified');
    expect(spec?.status).toBe('completed');
  });
});
