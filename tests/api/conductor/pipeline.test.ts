/**
 * Conductor Pipeline E2E Integration Test
 *
 * Tests that all 5 pipeline stages (Scout → Triage → Batch → Execute → Review)
 * are properly connected and the orchestrator drives them correctly.
 *
 * Mocks: external fetch calls (idea generation, tinder, CLI execution)
 * Real: database operations, stage logic, orchestrator flow
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// Test database setup (conductor-specific tables)
// ============================================================================

const TEST_DB_PATH = path.resolve(process.cwd(), 'database', 'test-conductor.db');
let testDb: Database.Database;

function createConductorTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conductor_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      current_stage TEXT,
      cycle INTEGER DEFAULT 1,
      config_snapshot TEXT,
      stages_state TEXT,
      metrics TEXT,
      process_log TEXT DEFAULT '[]',
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

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

    CREATE TABLE IF NOT EXISTS conductor_healing_patches (
      id TEXT PRIMARY KEY,
      pipeline_run_id TEXT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      original_value TEXT,
      patched_value TEXT NOT NULL,
      reason TEXT,
      error_pattern TEXT,
      applied_at TEXT,
      effectiveness REAL,
      reverted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ============================================================================
// Mock the database connection module
// ============================================================================

vi.mock('@/app/db/connection', () => ({
  getDatabase: () => testDb,
  closeDatabase: () => {},
}));

// Track ideas "created" during scout CLI execution
let mockIdeasInDb: Array<{ id: string; project_id: string }> = [];

// Mock contexts for context-aware scanning
let mockContextsInDb: Array<{ id: string; name: string; project_id: string; category?: string }> = [];

vi.mock('@/app/db', () => ({
  ideaDb: {
    getIdeasByProject: (projectId: string) => mockIdeasInDb.filter(i => i.project_id === projectId),
    getIdeaById: (id: string) => {
      const idea = mockIdeasInDb.find(i => i.id === id);
      return idea ? { ...idea, effort: null, impact: null, risk: null } : null;
    },
  },
  contextDb: {
    getContextsByProject: (projectId: string) => mockContextsInDb.filter(c => c.project_id === projectId),
  },
  contextGroupDb: {},
  goalDb: {},
  scanDb: {},
}));

// Mock folderManager — execute stage reads requirement files
vi.mock('@/app/Claude/sub_ClaudeCodeManager/folderManager', () => ({
  readRequirement: (_projectPath: string, reqName: string) => ({
    success: true,
    content: `# Requirement: ${reqName}\n\nImplement this task.`,
  }),
}));

// Mock brain behavioral context (used by triage for evaluation)
vi.mock('@/lib/brain/behavioralContext', () => ({
  getBehavioralContext: () => ({
    hasData: false,
    currentFocus: { activeContexts: [], recentFiles: [], recentCommitThemes: [] },
    trending: { hotEndpoints: [], activeFeatures: [], neglectedAreas: [] },
    patterns: { successRate: 0, recentSuccesses: 0, recentFailures: 0, revertedCount: 0, averageTaskDuration: 0, preferredContexts: [] },
    topInsights: [],
  }),
}));

// Mock CLI service — scout dispatches CLI execution directly
let mockExecCounter = 0;
vi.mock('@/lib/claude-terminal/cli-service', () => ({
  startExecution: vi.fn((_projectPath: string, _prompt: string, _resumeSession?: string, _onEvent?: any, _providerConfig?: any, extraEnv?: Record<string, string>) => {
    // Simulate CLI creating ideas by adding them to mockIdeasInDb
    const projectId = extraEnv?.VIBEMAN_PROJECT_ID || 'proj-001';
    const execId = `exec-mock-${++mockExecCounter}`;
    const ts = Date.now();
    mockIdeasInDb.push(
      { id: `idea-${ts}-1`, project_id: projectId },
      { id: `idea-${ts}-2`, project_id: projectId },
      { id: `idea-${ts}-3`, project_id: projectId },
    );
    return execId;
  }),
  getExecution: vi.fn((_executionId: string) => ({
    id: _executionId,
    status: 'completed',
    projectPath: '/test/project',
    events: [],
  })),
  abortExecution: vi.fn(() => true),
  getActiveExecutions: vi.fn(() => []),
}));

// ============================================================================
// Mock global fetch for API calls
// ============================================================================

const fetchMock = vi.fn();

// Track which API endpoints were called and in what order
const apiCallLog: string[] = [];

function setupFetchMock() {
  apiCallLog.length = 0;

  fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : String(url);
    const method = options?.method || 'GET';
    apiCallLog.push(`${method} ${urlStr}`);

    // Scout: /api/ideas/claude — return requirement content for CLI dispatch
    if (urlStr.includes('/api/ideas/claude')) {
      return new Response(JSON.stringify({
        success: true,
        requirementName: 'idea-gen-test-001',
        requirementContent: '# Test requirement\nGenerate ideas for the project.',
        scanType: 'zen_architect',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Triage: fetch ideas by project — return idea details for all ideas in mock DB
    if (urlStr.includes('/api/ideas?projectId=')) {
      const ideas = mockIdeasInDb.map((i, idx) => ({
        id: i.id,
        title: `Test idea ${idx + 1}`,
        description: `Description for idea ${idx + 1}`,
        effort: idx % 3 === 2 ? 8 : 3,
        impact: idx % 3 === 2 ? 4 : 8,
        risk: idx % 3 === 2 ? 7 : 2,
        category: idx % 2 === 0 ? 'ui' : 'maintenance',
      }));
      return new Response(JSON.stringify({
        success: true,
        ideas,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Triage: accept/reject idea (unified endpoint)
    if (urlStr.includes('/api/tinder/actions')) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Batch: create requirement file
    if (urlStr.includes('/api/claude-code/requirement')) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Review: record brain signals
    if (urlStr.includes('/api/brain/signals')) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Healing: load active patches
    if (urlStr.includes('/api/conductor/healing')) {
      return new Response(JSON.stringify({ patches: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Default: 404
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  global.fetch = fetchMock as unknown as typeof fetch;
}

// ============================================================================
// Test setup and teardown
// ============================================================================

beforeAll(() => {
  // Create test database
  const dbDir = path.dirname(TEST_DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  testDb = new Database(TEST_DB_PATH);
  testDb.pragma('journal_mode = WAL');
  createConductorTables(testDb);
});

afterAll(() => {
  testDb?.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  const walPath = TEST_DB_PATH + '-wal';
  const shmPath = TEST_DB_PATH + '-shm';
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
});

beforeEach(() => {
  setupFetchMock();
  // Clean tables
  testDb.exec('DELETE FROM conductor_runs');
  testDb.exec('DELETE FROM conductor_errors');
  testDb.exec('DELETE FROM conductor_healing_patches');
  // Reset mock databases and exec counter
  mockIdeasInDb = [];
  mockContextsInDb = [];
  mockExecCounter = 0;
  // Set env
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// Stage Unit Tests
// ============================================================================

describe('Conductor Pipeline Stages', () => {
  describe('Scout Stage', () => {
    it('should generate ideas by calling the ideas API', async () => {
      const { executeScoutStage } = await import(
        '@/app/features/Manager/lib/conductor/stages/scoutStage'
      );
      const { DEFAULT_BALANCING_CONFIG } = await import(
        '@/app/features/Manager/lib/conductor/types'
      );

      const results = await executeScoutStage({
        projectId: 'proj-001',
        projectPath: '/test/project',
        projectName: 'TestProject',
        config: DEFAULT_BALANCING_CONFIG,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].ideasGenerated).toBe(3);
      expect(results[0].ideaIds).toHaveLength(3);

      // Verify the ideas API was called
      const scoutCalls = apiCallLog.filter((c) => c.includes('/api/ideas/claude'));
      expect(scoutCalls.length).toBeGreaterThan(0);
    });

    it('should run one scan per (scanType, context) pair', async () => {
      // Set up contexts for the project
      mockContextsInDb = [
        { id: 'ctx-auth', name: 'Authentication', project_id: 'proj-ctx-001', category: 'api' },
        { id: 'ctx-ui', name: 'Dashboard UI', project_id: 'proj-ctx-001', category: 'ui' },
      ];

      const { executeScoutStage } = await import(
        '@/app/features/Manager/lib/conductor/stages/scoutStage'
      );
      const { DEFAULT_BALANCING_CONFIG } = await import(
        '@/app/features/Manager/lib/conductor/types'
      );

      const progressEvents: string[] = [];

      const results = await executeScoutStage({
        projectId: 'proj-ctx-001',
        projectPath: '/test/project',
        projectName: 'TestProject',
        config: {
          ...DEFAULT_BALANCING_CONFIG,
          scanTypes: ['bug_hunter'],
          scanStrategy: 'rotate',
          contextStrategy: 'all',
          maxIdeasPerCycle: 20,
        },
        onProgress: (event, message) => {
          progressEvents.push(`${event}: ${message}`);
        },
      });

      // With 1 scan type × 2 contexts = 2 pairs
      expect(results).toHaveLength(2);

      // Each pair should have context info
      expect(results[0].contextId).toBe('ctx-auth');
      expect(results[0].contextName).toBe('Authentication');
      expect(results[1].contextId).toBe('ctx-ui');
      expect(results[1].contextName).toBe('Dashboard UI');

      // Progress events should show per-pair start/completion
      expect(progressEvents.some(e => e.includes('Scanning bug_hunter on "Authentication"'))).toBe(true);
      expect(progressEvents.some(e => e.includes('Scanning bug_hunter on "Dashboard UI"'))).toBe(true);

      // The ideas API should have been called with contextId
      const claudeCalls = apiCallLog.filter(c => c.includes('/api/ideas/claude'));
      expect(claudeCalls).toHaveLength(2);
    });

    it('should return 0 ideas when API fails', async () => {
      // Override fetch to fail for ideas
      fetchMock.mockImplementation(async (url: string) => {
        if (String(url).includes('/api/ideas/claude')) {
          return new Response(JSON.stringify({ success: false, error: 'API error' }), {
            status: 500,
          });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });

      const { executeScoutStage } = await import(
        '@/app/features/Manager/lib/conductor/stages/scoutStage'
      );
      const { DEFAULT_BALANCING_CONFIG } = await import(
        '@/app/features/Manager/lib/conductor/types'
      );

      const results = await executeScoutStage({
        projectId: 'proj-001',
        projectPath: '/test/project',
        projectName: 'TestProject',
        config: DEFAULT_BALANCING_CONFIG,
      });

      // All scan types should report 0 ideas (errors caught internally)
      const totalIdeas = results.reduce((s, r) => s + r.ideasGenerated, 0);
      expect(totalIdeas).toBe(0);
    });
  });

  describe('Triage Stage', () => {
    it('should accept ideas that meet thresholds and reject others', async () => {
      const { executeTriageStage } = await import(
        '@/app/features/Manager/lib/conductor/stages/triageStage'
      );
      const { DEFAULT_BALANCING_CONFIG } = await import(
        '@/app/features/Manager/lib/conductor/types'
      );

      const ideas = [
        { id: 'idea-001', title: 'Add dark mode', effort: 3, impact: 8, risk: 2, category: 'ui' },
        { id: 'idea-002', title: 'Fix login bug', effort: 2, impact: 9, risk: 3, category: 'bug' },
        { id: 'idea-003', title: 'Refactor DB layer', effort: 8, impact: 4, risk: 7, category: 'maintenance' },
      ];

      const result = await executeTriageStage({
        ideas,
        config: DEFAULT_BALANCING_CONFIG,
        projectId: 'proj-001',
        projectPath: '/test/project',
      });

      // idea-001 (effort=3, impact=8, risk=2) → accept (all within thresholds)
      // idea-002 (effort=2, impact=9, risk=3) → accept (all within thresholds)
      // idea-003 (effort=8, impact=4, risk=7) → reject (effort>maxEffort=7, impact<minImpact=5, risk>maxRisk=6)
      expect(result.acceptedIds).toContain('idea-001');
      expect(result.acceptedIds).toContain('idea-002');
      expect(result.rejectedIds).toContain('idea-003');

      // Verify tinder APIs were called
      const acceptCalls = apiCallLog.filter((c) => c.includes('/tinder/accept'));
      const rejectCalls = apiCallLog.filter((c) => c.includes('/tinder/reject'));
      expect(acceptCalls.length).toBe(2);
      expect(rejectCalls.length).toBe(1);
    });
  });

  describe('Batch Stage', () => {
    it('should create requirement files and assign models', async () => {
      const { executeBatchStage } = await import(
        '@/app/features/Manager/lib/conductor/stages/batchStage'
      );
      const { DEFAULT_BALANCING_CONFIG } = await import(
        '@/app/features/Manager/lib/conductor/types'
      );

      const acceptedIdeas = [
        { id: 'idea-001', title: 'Add dark mode', description: 'Implement dark theme', effort: 3, impact: 8, risk: 2, category: 'ui' },
        { id: 'idea-002', title: 'Fix login bug', description: 'Auth timeout issue', effort: 2, impact: 9, risk: 3, category: 'bug' },
      ];

      const descriptor = await executeBatchStage({
        acceptedIdeas,
        config: DEFAULT_BALANCING_CONFIG,
        projectId: 'proj-001',
        projectPath: '/test/project',
        projectName: 'TestProject',
      });

      expect(descriptor.requirementNames).toHaveLength(2);
      expect(Object.keys(descriptor.modelAssignments)).toHaveLength(2);

      // Verify requirement files were created
      const requirementCalls = apiCallLog.filter((c) => c.includes('/api/claude-code/requirement'));
      expect(requirementCalls.length).toBe(2);

      // Verify model assignments exist
      for (const reqName of descriptor.requirementNames) {
        const assignment = descriptor.modelAssignments[reqName];
        expect(assignment).toBeDefined();
        expect(assignment.provider).toBeDefined();
        expect(assignment.model).toBeDefined();
      }
    });
  });

  describe('Execute Stage', () => {
    it('should dispatch tasks and collect results', async () => {
      const { executeExecuteStage } = await import(
        '@/app/features/Manager/lib/conductor/stages/executeStage'
      );
      const { DEFAULT_BALANCING_CONFIG } = await import(
        '@/app/features/Manager/lib/conductor/types'
      );
      const cliService = await import('@/lib/claude-terminal/cli-service');

      const result = await executeExecuteStage({
        batch: {
          id: 'batch-001',
          requirementNames: ['req-a', 'req-b'],
          modelAssignments: {
            'req-a': { provider: 'claude', model: 'opus' },
            'req-b': { provider: 'claude', model: 'sonnet' },
          },
          dagDependencies: { 'req-a': [], 'req-b': [] },
        },
        config: DEFAULT_BALANCING_CONFIG,
        projectId: 'proj-001',
        projectPath: '/test/project',
        projectName: 'TestProject',
      });

      expect(result.results).toHaveLength(2);
      expect(result.results.every((r) => r.success)).toBe(true);

      // Verify startExecution was called for each task (reads requirement files, dispatches CLI)
      const startCalls = vi.mocked(cliService.startExecution).mock.calls;
      const execCalls = startCalls.filter(
        (call) => call[5]?.VIBEMAN_REQUIREMENT === 'req-a' || call[5]?.VIBEMAN_REQUIREMENT === 'req-b'
      );
      expect(execCalls.length).toBe(2);
    });
  });

  describe('Review Stage', () => {
    it('should aggregate metrics and make continue/stop decisions', async () => {
      const { executeReviewStage } = await import(
        '@/app/features/Manager/lib/conductor/stages/reviewStage'
      );
      const { DEFAULT_BALANCING_CONFIG, createEmptyMetrics } = await import(
        '@/app/features/Manager/lib/conductor/types'
      );

      const result = await executeReviewStage({
        executionResults: [
          { taskId: 'task-1', requirementName: 'req-a', success: true, durationMs: 5000 },
          { taskId: 'task-2', requirementName: 'req-b', success: false, error: 'Timeout', durationMs: 60000 },
        ],
        currentMetrics: { ...createEmptyMetrics(), ideasGenerated: 3 },
        currentCycle: 1,
        config: DEFAULT_BALANCING_CONFIG,
        projectId: 'proj-001',
      });

      // Should continue since cycle 1 < maxCycles 3 and success rate > 20%
      expect(result.decision.shouldContinue).toBe(true);
      expect(result.decision.successRate).toBe(0.5);
      expect(result.updatedMetrics.tasksCompleted).toBe(1);
      expect(result.updatedMetrics.tasksFailed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorType).toBe('timeout');
    });

    it('should stop when max cycles reached', async () => {
      const { executeReviewStage } = await import(
        '@/app/features/Manager/lib/conductor/stages/reviewStage'
      );
      const { DEFAULT_BALANCING_CONFIG, createEmptyMetrics } = await import(
        '@/app/features/Manager/lib/conductor/types'
      );

      const result = await executeReviewStage({
        executionResults: [
          { taskId: 'task-1', requirementName: 'req-a', success: true, durationMs: 5000 },
        ],
        currentMetrics: { ...createEmptyMetrics(), ideasGenerated: 5 },
        currentCycle: 3, // at max (default maxCyclesPerRun = 3)
        config: DEFAULT_BALANCING_CONFIG,
        projectId: 'proj-001',
      });

      expect(result.decision.shouldContinue).toBe(false);
      expect(result.decision.reason).toContain('max cycles');
    });
  });
});

// ============================================================================
// Full Pipeline E2E Test
// ============================================================================

describe('Conductor Pipeline E2E', () => {
  it('should execute all 5 stages in sequence: Scout → Triage → Batch → Execute → Review', async () => {
    const { v4: uuidv4 } = await import('uuid');
    const { DEFAULT_BALANCING_CONFIG } = await import(
      '@/app/features/Manager/lib/conductor/types'
    );

    const runId = uuidv4();
    const projectId = 'proj-e2e-001';
    const now = new Date().toISOString();

    // Create a run record (simulating what the API route does)
    testDb.prepare(`
      INSERT INTO conductor_runs (id, project_id, status, current_stage, cycle, config_snapshot, stages_state, metrics, started_at)
      VALUES (?, ?, 'running', 'scout', 1, ?, ?, ?, ?)
    `).run(
      runId,
      projectId,
      JSON.stringify(DEFAULT_BALANCING_CONFIG),
      JSON.stringify({
        scout: { status: 'pending', itemsIn: 0, itemsOut: 0 },
        triage: { status: 'pending', itemsIn: 0, itemsOut: 0 },
        batch: { status: 'pending', itemsIn: 0, itemsOut: 0 },
        execute: { status: 'pending', itemsIn: 0, itemsOut: 0 },
        review: { status: 'pending', itemsIn: 0, itemsOut: 0 },
      }),
      JSON.stringify({
        ideasGenerated: 0, ideasAccepted: 0, ideasRejected: 0,
        tasksCreated: 0, tasksCompleted: 0, tasksFailed: 0,
        healingPatchesApplied: 0, totalDurationMs: 0, estimatedCost: 0,
      }),
      now
    );

    // Import and start the pipeline
    const { startPipeline } = await import(
      '@/app/features/Manager/lib/conductor/conductorOrchestrator'
    );

    // Start the pipeline and wait for it to complete
    startPipeline(
      runId,
      projectId,
      { ...DEFAULT_BALANCING_CONFIG, maxCyclesPerRun: 1 }, // 1 cycle for test
      '/test/project',
      'TestProject'
    );

    // Wait for pipeline to complete (poll DB)
    let attempts = 0;
    let finalRun: any = null;
    while (attempts < 60) { // max 30 seconds
      await new Promise((r) => setTimeout(r, 500));

      const row = testDb.prepare('SELECT * FROM conductor_runs WHERE id = ?').get(runId) as any;
      if (row && (row.status === 'completed' || row.status === 'failed')) {
        finalRun = row;
        break;
      }
      attempts++;
    }

    expect(finalRun).not.toBeNull();
    expect(finalRun.status).toBe('completed');

    // Parse stages state and verify all stages were executed
    const stagesState = JSON.parse(finalRun.stages_state || '{}');

    // Scout should have run and produced items
    expect(stagesState.scout.status).toBe('completed');
    expect(stagesState.scout.itemsOut).toBeGreaterThan(0);

    // Triage should have processed ideas
    expect(stagesState.triage.status).toBe('completed');
    expect(stagesState.triage.itemsIn).toBeGreaterThan(0);

    // Batch should have created tasks (if ideas were accepted)
    if (stagesState.triage.itemsOut > 0) {
      expect(stagesState.batch.status).toBe('completed');
      expect(stagesState.batch.itemsOut).toBeGreaterThan(0);

      // Execute should have run tasks
      expect(stagesState.execute.status).toBe('completed');
    }

    // Review should have completed
    expect(stagesState.review.status).toBe('completed');

    // Parse metrics and verify
    const metrics = JSON.parse(finalRun.metrics || '{}');
    expect(metrics.ideasGenerated).toBeGreaterThan(0);

    // Verify the full API call chain:
    // 1. Scout called /api/ideas/claude
    expect(apiCallLog.some((c) => c.includes('/api/ideas/claude'))).toBe(true);
    // 2. Triage fetched ideas
    expect(apiCallLog.some((c) => c.includes('/api/ideas?projectId='))).toBe(true);
    // 3. Triage called accept/reject
    expect(apiCallLog.some((c) => c.includes('/tinder/'))).toBe(true);
    // 4. Batch created requirements
    expect(apiCallLog.some((c) => c.includes('/api/claude-code/requirement'))).toBe(true);
    // 5. Execute used startExecution directly (no API call — uses CLI service)
    const cliService = await import('@/lib/claude-terminal/cli-service');
    const execCalls = vi.mocked(cliService.startExecution).mock.calls.filter(
      (call) => call[5]?.VIBEMAN_REQUIREMENT
    );
    expect(execCalls.length).toBeGreaterThan(0);
  }, 60_000); // 60 second timeout for e2e

  it('should treat 0 ideas as failure and trigger healing', async () => {
    // Override CLI mock to NOT add ideas (simulates CLI generating nothing)
    const cliService = await import('@/lib/claude-terminal/cli-service');
    vi.mocked(cliService.startExecution).mockImplementation(() => {
      // Don't add ideas to mockIdeasInDb — simulates failed generation
      return 'exec-mock-empty';
    });
    vi.mocked(cliService.getExecution).mockReturnValue({
      id: 'exec-mock-empty',
      status: 'completed',
      projectPath: '/test/project',
      events: [],
    } as any);

    const { v4: uuidv4 } = await import('uuid');
    const { DEFAULT_BALANCING_CONFIG } = await import(
      '@/app/features/Manager/lib/conductor/types'
    );
    const { startPipeline } = await import(
      '@/app/features/Manager/lib/conductor/conductorOrchestrator'
    );

    const runId = uuidv4();
    const projectId = 'proj-empty-001';
    const now = new Date().toISOString();

    testDb.prepare(`
      INSERT INTO conductor_runs (id, project_id, status, current_stage, cycle, config_snapshot, stages_state, metrics, started_at)
      VALUES (?, ?, 'running', 'scout', 1, ?, ?, ?, ?)
    `).run(
      runId,
      projectId,
      JSON.stringify(DEFAULT_BALANCING_CONFIG),
      JSON.stringify({
        scout: { status: 'pending', itemsIn: 0, itemsOut: 0 },
        triage: { status: 'pending', itemsIn: 0, itemsOut: 0 },
        batch: { status: 'pending', itemsIn: 0, itemsOut: 0 },
        execute: { status: 'pending', itemsIn: 0, itemsOut: 0 },
        review: { status: 'pending', itemsIn: 0, itemsOut: 0 },
      }),
      JSON.stringify({
        ideasGenerated: 0, ideasAccepted: 0, ideasRejected: 0,
        tasksCreated: 0, tasksCompleted: 0, tasksFailed: 0,
        healingPatchesApplied: 0, totalDurationMs: 0, estimatedCost: 0,
      }),
      now
    );

    startPipeline(runId, projectId, { ...DEFAULT_BALANCING_CONFIG, maxCyclesPerRun: 1 }, '/test', 'Test');

    let attempts = 0;
    let finalRun: any = null;
    while (attempts < 30) {
      await new Promise((r) => setTimeout(r, 500));
      const row = testDb.prepare('SELECT * FROM conductor_runs WHERE id = ?').get(runId) as any;
      if (row && (row.status === 'completed' || row.status === 'failed')) {
        finalRun = row;
        break;
      }
      attempts++;
    }

    expect(finalRun).not.toBeNull();
    expect(finalRun.status).toBe('completed'); // Max cycles reached

    const stagesState = JSON.parse(finalRun.stages_state || '{}');
    // Scout is marked as FAILED when 0 ideas generated
    expect(stagesState.scout.status).toBe('failed');
    expect(stagesState.triage.status).toBe('skipped');
    expect(stagesState.batch.status).toBe('skipped');
    expect(stagesState.execute.status).toBe('skipped');

    // Process log should contain healing info
    const processLog = JSON.parse(finalRun.process_log || '[]');
    expect(processLog.length).toBeGreaterThan(0);
    const failEntry = processLog.find((e: any) => e.message.includes('0 ideas'));
    expect(failEntry).toBeDefined();
  }, 30_000);
});

// ============================================================================
// Self-Healing Tests
// ============================================================================

describe('Conductor Self-Healing', () => {
  it('should classify errors from execution failures', async () => {
    const { classifyError } = await import(
      '@/app/features/Manager/lib/conductor/selfHealing/errorClassifier'
    );

    const timeoutErr = classifyError(
      'Task execution timed out after 10 minutes',
      'execute',
      'run-001',
      'task-001'
    );
    expect(timeoutErr.errorType).toBe('timeout');

    const missingErr = classifyError(
      'File not found: src/components/Header.tsx',
      'execute',
      'run-001',
      'task-002'
    );
    expect(missingErr.errorType).toBe('missing_context');

    const toolErr = classifyError(
      'Edit tool error: could not modify the target string',
      'execute',
      'run-001',
      'task-003'
    );
    expect(toolErr.errorType).toBe('tool_failure');

    const depErr = classifyError(
      'npm ERR! missing dependency: lodash-es is not installed',
      'batch',
      'run-001',
      'task-004'
    );
    expect(depErr.errorType).toBe('dependency_missing');
  });

  it('should build healing context from active patches', async () => {
    const { buildHealingContext } = await import(
      '@/app/features/Manager/lib/conductor/selfHealing/promptPatcher'
    );

    const patches = [
      {
        id: 'patch-1',
        pipelineRunId: 'run-1',
        targetType: 'prompt' as const,
        targetId: 'healing_timeout',
        originalValue: '',
        patchedValue: 'Keep changes focused and minimal.',
        reason: 'Tasks timing out',
        errorPattern: 'timed out',
        appliedAt: new Date().toISOString(),
        reverted: false,
      },
      {
        id: 'patch-2',
        pipelineRunId: 'run-1',
        targetType: 'config' as const, // should be filtered out
        targetId: 'maxBatchSize',
        originalValue: '5',
        patchedValue: '3',
        reason: 'Reduce batch size',
        errorPattern: 'timeout',
        appliedAt: new Date().toISOString(),
        reverted: false,
      },
    ];

    const context = buildHealingContext(patches);

    // Should include prompt patches only
    expect(context).toContain('Self-Healing Context');
    expect(context).toContain('Keep changes focused and minimal');
  });

  it('should measure patch effectiveness correctly', async () => {
    const { measureEffectiveness, shouldAutoRevert } = await import(
      '@/app/features/Manager/lib/conductor/selfHealing/promptPatcher'
    );

    // 10 errors before, 2 after → 80% effective
    expect(measureEffectiveness({} as any, 10, 2)).toBe(0.8);

    // 10 errors before, 10 after → 0% effective
    expect(measureEffectiveness({} as any, 10, 10)).toBe(0);

    // 0 errors before → 100% effective (no baseline)
    expect(measureEffectiveness({} as any, 0, 0)).toBe(1);

    // Should auto-revert ineffective patches
    expect(shouldAutoRevert({
      effectiveness: 0.1,
      reverted: false,
    } as any)).toBe(true);

    expect(shouldAutoRevert({
      effectiveness: 0.5,
      reverted: false,
    } as any)).toBe(false);
  });
});

// ============================================================================
// Balancing Engine Tests
// ============================================================================

describe('Balancing Engine', () => {
  it('should route models based on idea effort and category', async () => {
    const { routeModel } = await import(
      '@/app/features/Manager/lib/conductor/balancingEngine'
    );
    const { DEFAULT_BALANCING_CONFIG } = await import(
      '@/app/features/Manager/lib/conductor/types'
    );

    // High effort → opus
    const highEffort = routeModel({ effort: 9, category: 'refactor' }, DEFAULT_BALANCING_CONFIG);
    expect(highEffort.model).toBe('opus');

    // Low effort → sonnet
    const lowEffort = routeModel({ effort: 2, category: 'bug' }, DEFAULT_BALANCING_CONFIG);
    expect(lowEffort.model).toBe('sonnet');

    // UI category → opus (updated default)
    const uiTask = routeModel({ effort: 5, category: 'ui' }, DEFAULT_BALANCING_CONFIG);
    expect(uiTask.model).toBe('opus');

    // Default → opus (updated default)
    const defaultTask = routeModel({ effort: 5, category: 'feature' }, DEFAULT_BALANCING_CONFIG);
    expect(defaultTask.model).toBe('opus');
  });

  it('should check quota limits', async () => {
    const { checkQuota } = await import(
      '@/app/features/Manager/lib/conductor/balancingEngine'
    );
    const { DEFAULT_BALANCING_CONFIG, createEmptyMetrics } = await import(
      '@/app/features/Manager/lib/conductor/types'
    );

    // With quota disabled, always allowed
    const result = checkQuota(DEFAULT_BALANCING_CONFIG, createEmptyMetrics());
    expect(result.allowed).toBe(true);

    // With quota enabled and within limits
    const configWithQuota = {
      ...DEFAULT_BALANCING_CONFIG,
      quotaLimits: { maxApiCallsPerHour: 100, maxTokensPerRun: 500000, enabled: true },
    };
    const withinLimits = checkQuota(configWithQuota, createEmptyMetrics());
    expect(withinLimits.allowed).toBe(true);

    // With quota enabled and exceeded
    const overMetrics = {
      ...createEmptyMetrics(),
      tasksCreated: 300,
      ideasGenerated: 500, // (300 + 500) * 1000 = 800K > 500K limit
    };
    const exceeded = checkQuota(configWithQuota, overMetrics);
    expect(exceeded.allowed).toBe(false);
    expect(exceeded.reason).toContain('Token budget exceeded');
  });
});
