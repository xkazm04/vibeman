/**
 * Spec Writer Tests (SPEC-01, SPEC-02, SPEC-03)
 *
 * Validates spec generation, template rendering, file management,
 * DB persistence, and Brain integration.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// Test database setup (inline, like run-history.test.ts pattern)
// ============================================================================

const TEST_DB_PATH = path.resolve(process.cwd(), 'database', 'test-spec-writer.db');
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
      stages TEXT,
      metrics TEXT,
      process_log TEXT DEFAULT '[]',
      should_abort INTEGER DEFAULT 0,
      error_message TEXT,
      queued_at TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
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

// Mock Brain behavioral context
const mockGetBehavioralContext = vi.fn();
vi.mock('@/lib/brain/behavioralContext', () => ({
  getBehavioralContext: (...args: any[]) => mockGetBehavioralContext(...args),
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { renderSpec, generateSlug, deriveComplexity } from '@/app/features/Manager/lib/conductor/spec/specTemplate';
import { specFileManager } from '@/app/features/Manager/lib/conductor/spec/specFileManager';
import { specRepository } from '@/app/features/Manager/lib/conductor/spec/specRepository';
import type { SpecRenderData, AffectedFiles, CodeConvention, SpecComplexity } from '@/app/features/Manager/lib/conductor/types';

// ============================================================================
// Test helpers
// ============================================================================

function createFullRenderData(overrides?: Partial<SpecRenderData>): SpecRenderData {
  return {
    title: 'Fix Authentication Middleware',
    goalDescription: 'Improve auth flow for the application',
    acceptanceCriteria: [
      { given: 'a user with valid token', when: 'they access a protected route', then: 'access is granted' },
      { given: 'a user with expired token', when: 'they access a protected route', then: 'they receive a 401 error' },
      { given: 'an unauthenticated user', when: 'they access a public route', then: 'access is granted without token' },
    ],
    affectedFiles: {
      create: ['src/middleware/auth-guard.ts'],
      modify: ['src/middleware/auth.ts', 'src/lib/token.ts'],
      delete: [],
    },
    approach: 'Refactor the authentication middleware to support token refresh and guard patterns.',
    codeConventions: [
      { rule: 'Use async/await over .then() chains', confidence: 'Strong pattern', source: 'Code style' },
      { rule: 'Wrap DB calls in try/catch', confidence: 'Emerging pattern', source: 'Error handling' },
    ],
    constraints: [
      'Do NOT modify files outside the affected files list',
      'Do NOT add new dependencies without explicit justification',
    ],
    complexity: 'M',
    ...overrides,
  };
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
  mockGetBehavioralContext.mockReset();
});

afterAll(() => {
  testDb.close();
  try { fs.unlinkSync(TEST_DB_PATH); } catch {}
  try { fs.unlinkSync(TEST_DB_PATH + '-wal'); } catch {}
  try { fs.unlinkSync(TEST_DB_PATH + '-shm'); } catch {}
});

// ============================================================================
// renderSpec (SPEC-02)
// ============================================================================

describe('renderSpec', () => {
  it('contains all 7 required sections', () => {
    const data = createFullRenderData();
    const output = renderSpec(data);

    expect(output).toContain('## Goal');
    expect(output).toContain('## Acceptance Criteria');
    expect(output).toContain('## Affected Files');
    expect(output).toContain('## Approach');
    expect(output).toContain('## Code Conventions');
    expect(output).toContain('## Constraints');
    expect(output).toContain('## Complexity');
  });

  it('acceptance criteria use GIVEN/WHEN/THEN format', () => {
    const data = createFullRenderData();
    const output = renderSpec(data);

    const givenWhenThenPattern = /- GIVEN .+ WHEN .+ THEN .+/;
    const lines = output.split('\n');
    const criteriaLines = lines.filter(l => givenWhenThenPattern.test(l));
    expect(criteriaLines.length).toBe(3);
  });

  it('affected files rendered as JSON code block', () => {
    const data = createFullRenderData();
    const output = renderSpec(data);

    expect(output).toContain('```json');
    // Extract the JSON block content
    const jsonMatch = output.match(/```json\n([\s\S]*?)\n```/);
    expect(jsonMatch).not.toBeNull();
    const parsed = JSON.parse(jsonMatch![1]);
    expect(parsed).toHaveProperty('create');
    expect(parsed).toHaveProperty('modify');
    expect(parsed).toHaveProperty('delete');
  });

  it('omits Code Conventions when null', () => {
    const data = createFullRenderData({ codeConventions: null });
    const output = renderSpec(data);

    expect(output).not.toContain('## Code Conventions');
  });

  it('includes complexity as single letter', () => {
    for (const complexity of ['S', 'M', 'L'] as SpecComplexity[]) {
      const data = createFullRenderData({ complexity });
      const output = renderSpec(data);

      // The Complexity section should contain the letter
      const complexitySection = output.split('## Complexity')[1];
      expect(complexitySection).toBeDefined();
      expect(complexitySection!.trim().startsWith(complexity)).toBe(true);
    }
  });
});

// ============================================================================
// generateSlug
// ============================================================================

describe('generateSlug', () => {
  it('converts title to lowercase hyphenated slug', () => {
    expect(generateSlug('Fix Auth Middleware')).toBe('fix-auth-middleware');
  });

  it('truncates to 50 characters', () => {
    const longTitle = 'This is a very long title that should definitely be truncated to fifty characters or less to avoid filesystem issues';
    const slug = generateSlug(longTitle);
    expect(slug.length).toBeLessThanOrEqual(50);
  });

  it('strips leading/trailing hyphens', () => {
    expect(generateSlug(' - hello - ')).toBe('hello');
  });
});

// ============================================================================
// deriveComplexity
// ============================================================================

describe('deriveComplexity', () => {
  it('returns S for effort <= 3', () => {
    expect(deriveComplexity(1)).toBe('S');
    expect(deriveComplexity(2)).toBe('S');
    expect(deriveComplexity(3)).toBe('S');
  });

  it('returns M for effort 4-6', () => {
    expect(deriveComplexity(4)).toBe('M');
    expect(deriveComplexity(5)).toBe('M');
    expect(deriveComplexity(6)).toBe('M');
  });

  it('returns L for effort > 6', () => {
    expect(deriveComplexity(7)).toBe('L');
    expect(deriveComplexity(8)).toBe('L');
    expect(deriveComplexity(9)).toBe('L');
  });
});

// ============================================================================
// specFileManager
// ============================================================================

describe('specFileManager', () => {
  it('formatFilename pads sequence to 3 digits', () => {
    expect(specFileManager.formatFilename(1, 'fix-auth')).toBe('001-fix-auth.md');
  });

  it('formatFilename handles double digits', () => {
    expect(specFileManager.formatFilename(12, 'add-store')).toBe('012-add-store.md');
  });
});

// ============================================================================
// specRepository (SPEC-01)
// ============================================================================

describe('specRepository', () => {
  const RUN_ID = 'test-run-001';

  beforeEach(() => {
    // Insert a conductor_run so FK constraint is satisfied
    testDb.prepare('INSERT INTO conductor_runs (id, project_id, status) VALUES (?, ?, ?)').run(
      RUN_ID, 'test-project', 'running'
    );
  });

  it('createSpec persists and returns metadata', () => {
    const spec = specRepository.createSpec({
      id: 'spec-001',
      runId: RUN_ID,
      backlogItemId: 'item-001',
      sequenceNumber: 1,
      title: 'Fix Auth',
      slug: 'fix-auth',
      affectedFiles: { create: [], modify: ['src/auth.ts'], delete: [] },
      complexity: 'S',
    });

    expect(spec).toBeDefined();
    expect(spec.id).toBe('spec-001');
    expect(spec.runId).toBe(RUN_ID);
    expect(spec.backlogItemId).toBe('item-001');
    expect(spec.sequenceNumber).toBe(1);
    expect(spec.title).toBe('Fix Auth');
    expect(spec.slug).toBe('fix-auth');
    expect(spec.affectedFiles).toEqual({ create: [], modify: ['src/auth.ts'], delete: [] });
    expect(spec.complexity).toBe('S');
    expect(spec.status).toBe('pending');
    expect(spec.createdAt).toBeDefined();
  });

  it('getSpecsByRunId returns specs ordered by sequence_number', () => {
    // Insert out of order
    specRepository.createSpec({
      id: 'spec-c', runId: RUN_ID, backlogItemId: 'item-3',
      sequenceNumber: 3, title: 'Third', slug: 'third',
      affectedFiles: { create: [], modify: [], delete: [] }, complexity: 'L',
    });
    specRepository.createSpec({
      id: 'spec-a', runId: RUN_ID, backlogItemId: 'item-1',
      sequenceNumber: 1, title: 'First', slug: 'first',
      affectedFiles: { create: [], modify: [], delete: [] }, complexity: 'S',
    });
    specRepository.createSpec({
      id: 'spec-b', runId: RUN_ID, backlogItemId: 'item-2',
      sequenceNumber: 2, title: 'Second', slug: 'second',
      affectedFiles: { create: [], modify: [], delete: [] }, complexity: 'M',
    });

    const specs = specRepository.getSpecsByRunId(RUN_ID);
    expect(specs).toHaveLength(3);
    expect(specs[0].sequenceNumber).toBe(1);
    expect(specs[1].sequenceNumber).toBe(2);
    expect(specs[2].sequenceNumber).toBe(3);
  });

  it('updateSpecStatus changes status', () => {
    specRepository.createSpec({
      id: 'spec-status', runId: RUN_ID, backlogItemId: 'item-s',
      sequenceNumber: 1, title: 'Status Test', slug: 'status-test',
      affectedFiles: { create: [], modify: [], delete: [] }, complexity: 'S',
    });

    specRepository.updateSpecStatus('spec-status', 'executing');
    const spec = specRepository.getSpecById('spec-status');
    expect(spec).not.toBeNull();
    expect(spec!.status).toBe('executing');
  });

  it('deleteSpecsByRunId removes all specs for a run', () => {
    specRepository.createSpec({
      id: 'spec-del-1', runId: RUN_ID, backlogItemId: 'item-d1',
      sequenceNumber: 1, title: 'Delete 1', slug: 'delete-1',
      affectedFiles: { create: [], modify: [], delete: [] }, complexity: 'S',
    });
    specRepository.createSpec({
      id: 'spec-del-2', runId: RUN_ID, backlogItemId: 'item-d2',
      sequenceNumber: 2, title: 'Delete 2', slug: 'delete-2',
      affectedFiles: { create: [], modify: [], delete: [] }, complexity: 'M',
    });

    specRepository.deleteSpecsByRunId(RUN_ID);
    const specs = specRepository.getSpecsByRunId(RUN_ID);
    expect(specs).toHaveLength(0);
  });
});

// ============================================================================
// Brain integration (SPEC-03)
// ============================================================================

describe('Brain integration', () => {
  it('includes conventions when Brain has data', () => {
    // When Brain returns hasData: true with topInsights, the rendered spec
    // should contain convention entries with Strong/Emerging labels
    const conventions: CodeConvention[] = [
      { rule: 'Use async/await everywhere', confidence: 'Strong pattern', source: 'Code style' },
      { rule: 'Add JSDoc to exports', confidence: 'Emerging pattern', source: 'Documentation' },
    ];

    const data = createFullRenderData({ codeConventions: conventions });
    const output = renderSpec(data);

    expect(output).toContain('## Code Conventions');
    expect(output).toContain('Strong pattern');
    expect(output).toContain('Emerging pattern');
    expect(output).toContain('Use async/await everywhere');
  });

  it('omits Code Conventions when Brain has no data', () => {
    const data = createFullRenderData({ codeConventions: null });
    const output = renderSpec(data);

    expect(output).not.toContain('## Code Conventions');
  });
});
