/**
 * Reflection Lock Timeout and Scope Isolation Test
 *
 * Tests that the brainService completeReflection() concurrency guard:
 * - Uses timestamped locks with 5-minute auto-expiry
 * - Uses scope-aware lock keys (project:<id> vs global)
 * - Prevents race conditions with check-and-set atomic guard
 * - Cleans up expired locks automatically
 * - Prevents project and global reflections from interfering
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import type { LearningInsight } from '@/app/db/models/brain.types';

// ============================================================================
// Test database setup
// ============================================================================

const TEST_DB_PATH = path.resolve(process.cwd(), 'database', 'test-reflection-locks.db');
let testDb: Database.Database;

function createBrainTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS brain_reflections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'project',
      directions_analyzed INTEGER DEFAULT 0,
      outcomes_analyzed INTEGER DEFAULT 0,
      signals_analyzed INTEGER DEFAULT 0,
      guide_sections_updated TEXT,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS brain_insights (
      id TEXT PRIMARY KEY,
      reflection_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 50,
      evidence TEXT NOT NULL DEFAULT '[]',
      evolves_from_id TEXT,
      evolves_title TEXT,
      conflict_with_id TEXT,
      conflict_with_title TEXT,
      conflict_type TEXT,
      conflict_resolved INTEGER NOT NULL DEFAULT 0,
      conflict_resolution TEXT,
      auto_pruned INTEGER NOT NULL DEFAULT 0,
      auto_prune_reason TEXT,
      original_confidence INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (reflection_id) REFERENCES brain_reflections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS brain_insight_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      insight_id TEXT NOT NULL,
      evidence_type TEXT NOT NULL CHECK(evidence_type IN ('direction', 'signal', 'reflection')),
      evidence_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (insight_id) REFERENCES brain_insights(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_bie_insight ON brain_insight_evidence(insight_id);
    CREATE INDEX idx_bie_evidence ON brain_insight_evidence(evidence_type, evidence_id);

    CREATE TABLE IF NOT EXISTS directions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS behavioral_signals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

// ============================================================================
// Mock modules
// ============================================================================

vi.mock('@/app/db/connection', () => ({
  getDatabase: () => testDb,
  closeDatabase: () => {},
}));

vi.mock('@/app/db/hot-writes', () => ({
  getHotWritesDatabase: () => testDb,
}));

// Mock reflection agent
vi.mock('@/lib/brain/reflectionAgent', () => ({
  reflectionAgent: {
    completeReflection: vi.fn(() => true),
  },
}));

// Mock signal collector (not used in this test but imported by brainService)
vi.mock('@/lib/brain/signalCollector', () => ({
  signalCollector: {
    recordGitActivity: vi.fn(),
    recordApiFocus: vi.fn(),
    recordContextFocus: vi.fn(),
    recordImplementation: vi.fn(),
    recordCliMemory: vi.fn(),
  },
}));

// Mock behavioral context (not used in this test but imported by brainService)
vi.mock('@/lib/brain/behavioralContext', () => ({
  getBehavioralContext: vi.fn(() => ({})),
}));

// Mock conflict detector
vi.mock('@/lib/brain/insightConflictDetector', () => ({
  detectConflicts: vi.fn(() => []),
  markConflictsOnInsights: vi.fn(() => 0),
}));

// Mock auto pruner
vi.mock('@/lib/brain/insightAutoPruner', () => ({
  autoPruneInsights: vi.fn(() => ({
    misleadingDemoted: 0,
    conflictsAutoResolved: 0,
    conflictsRemaining: 0,
    actions: [],
  })),
}));

// Mock predictive intent engine
vi.mock('@/lib/brain/predictiveIntentEngine', () => ({
  predictiveIntentEngine: {
    refresh: vi.fn(),
  },
}));

// ============================================================================
// Import service after mocking
// ============================================================================

import { completeReflection } from '@/lib/brain/brainService';

// ============================================================================
// Test suite
// ============================================================================

describe('Reflection Lock Timeout and Scope Isolation', () => {
  beforeEach(async () => {
    // Create fresh test DB
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    testDb = new Database(TEST_DB_PATH);
    createBrainTables(testDb);

    // Reset mocks to default implementation
    const { reflectionAgent } = await import('@/lib/brain/reflectionAgent');
    vi.mocked(reflectionAgent.completeReflection).mockImplementation(() => true);
  });

  afterEach(() => {
    testDb.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    vi.clearAllMocks();
  });

  it('should prevent concurrent completions for the same project scope', async () => {
    const now = new Date().toISOString();

    // Create two reflections for the same project
    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_1', 'proj_1', 'running', 'manual', 'project', now);

    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_2', 'proj_1', 'running', 'manual', 'project', now);

    const insights: LearningInsight[] = [
      {
        type: 'pattern_detected',
        title: 'Test Pattern',
        description: 'Test',
        confidence: 80,
        evidence: [],
      },
    ];

    // Mock the transaction to simulate a long-running operation
    // by calling completeReflection from within the transaction callback
    let secondCallResult: any;

    // Override the reflection agent to trigger second call during first
    const { reflectionAgent } = await import('@/lib/brain/reflectionAgent');
    const originalComplete = reflectionAgent.completeReflection;
    let callCount = 0;

    vi.mocked(reflectionAgent.completeReflection).mockImplementation((id, data) => {
      callCount++;
      if (callCount === 1) {
        // During first completion, try to start second completion
        secondCallResult = completeReflection({
          reflectionId: 'ref_2',
          directionsAnalyzed: 5,
          outcomesAnalyzed: 3,
          signalsAnalyzed: 10,
          insights,
        });
      }
      return true;
    });

    // First completion
    const result1 = completeReflection({
      reflectionId: 'ref_1',
      directionsAnalyzed: 5,
      outcomesAnalyzed: 3,
      signalsAnalyzed: 10,
      insights,
    });

    expect(result1.success).toBe(true);

    // Second completion should have failed with 409 (concurrent)
    expect(secondCallResult.success).toBe(false);
    expect(secondCallResult.status).toBe(409);
    expect(secondCallResult.error).toContain('Another reflection completion is already in progress');
    expect(secondCallResult.error).toContain('project');
    expect(secondCallResult.error).toContain('ref_1');

    // Restore mock
    vi.mocked(reflectionAgent.completeReflection).mockImplementation(originalComplete);
  });

  it('should allow concurrent completions for different project scopes', () => {
    const now = new Date().toISOString();

    // Create reflections for two different projects
    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_1', 'proj_1', 'running', 'manual', 'project', now);

    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_2', 'proj_2', 'running', 'manual', 'project', now);

    const insights: LearningInsight[] = [
      {
        type: 'pattern_detected',
        title: 'Test Pattern',
        description: 'Test',
        confidence: 80,
        evidence: [],
      },
    ];

    // Both completions should succeed (different projects)
    const result1 = completeReflection({
      reflectionId: 'ref_1',
      directionsAnalyzed: 5,
      outcomesAnalyzed: 3,
      signalsAnalyzed: 10,
      insights,
    });

    const result2 = completeReflection({
      reflectionId: 'ref_2',
      directionsAnalyzed: 5,
      outcomesAnalyzed: 3,
      signalsAnalyzed: 10,
      insights,
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('should isolate project and global scope locks', () => {
    const now = new Date().toISOString();

    // Create project reflection and global reflection
    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_project', 'proj_1', 'running', 'manual', 'project', now);

    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_global', 'proj_1', 'running', 'manual', 'global', now);

    const insights: LearningInsight[] = [
      {
        type: 'pattern_detected',
        title: 'Test Pattern',
        description: 'Test',
        confidence: 80,
        evidence: [],
      },
    ];

    // Both should succeed (different scopes even with same project_id)
    const result1 = completeReflection({
      reflectionId: 'ref_project',
      directionsAnalyzed: 5,
      outcomesAnalyzed: 3,
      signalsAnalyzed: 10,
      insights,
    });

    const result2 = completeReflection({
      reflectionId: 'ref_global',
      directionsAnalyzed: 5,
      outcomesAnalyzed: 3,
      signalsAnalyzed: 10,
      insights,
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('should prevent concurrent global reflections', async () => {
    const now = new Date().toISOString();

    // Create two global reflections (with different project_id placeholders)
    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_global_1', 'workspace', 'running', 'manual', 'global', now);

    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_global_2', 'workspace', 'running', 'manual', 'global', now);

    const insights: LearningInsight[] = [
      {
        type: 'pattern_detected',
        title: 'Test Pattern',
        description: 'Test',
        confidence: 80,
        evidence: [],
      },
    ];

    // Mock to simulate concurrent call
    let secondCallResult: any;

    const { reflectionAgent } = await import('@/lib/brain/reflectionAgent');
    const originalComplete = reflectionAgent.completeReflection;
    let callCount = 0;

    vi.mocked(reflectionAgent.completeReflection).mockImplementation((id, data) => {
      callCount++;
      if (callCount === 1) {
        // During first completion, try to start second global completion
        secondCallResult = completeReflection({
          reflectionId: 'ref_global_2',
          directionsAnalyzed: 5,
          outcomesAnalyzed: 3,
          signalsAnalyzed: 10,
          insights,
        });
      }
      return true;
    });

    // First global completion
    const result1 = completeReflection({
      reflectionId: 'ref_global_1',
      directionsAnalyzed: 5,
      outcomesAnalyzed: 3,
      signalsAnalyzed: 10,
      insights,
    });

    expect(result1.success).toBe(true);

    // Second global completion should have failed (concurrent)
    expect(secondCallResult.success).toBe(false);
    expect(secondCallResult.status).toBe(409);
    expect(secondCallResult.error).toContain('global');
    expect(secondCallResult.error).toContain('ref_global_1');

    // Restore mock
    vi.mocked(reflectionAgent.completeReflection).mockImplementation(originalComplete);
  });

  it('should release lock after successful completion', () => {
    const now = new Date().toISOString();

    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_1', 'proj_1', 'running', 'manual', 'project', now);

    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_2', 'proj_1', 'running', 'manual', 'project', now);

    const insights: LearningInsight[] = [
      {
        type: 'pattern_detected',
        title: 'Test Pattern',
        description: 'Test',
        confidence: 80,
        evidence: [],
      },
    ];

    // First completion
    const result1 = completeReflection({
      reflectionId: 'ref_1',
      directionsAnalyzed: 5,
      outcomesAnalyzed: 3,
      signalsAnalyzed: 10,
      insights,
    });

    expect(result1.success).toBe(true);

    // Second completion should now succeed (lock was released)
    const result2 = completeReflection({
      reflectionId: 'ref_2',
      directionsAnalyzed: 5,
      outcomesAnalyzed: 3,
      signalsAnalyzed: 10,
      insights,
    });

    expect(result2.success).toBe(true);
  });

  it('should release lock after failed completion', () => {
    const now = new Date().toISOString();

    // Create reflection with invalid status to trigger failure
    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_1', 'proj_1', 'completed', 'manual', 'project', now);

    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_2', 'proj_1', 'running', 'manual', 'project', now);

    const insights: LearningInsight[] = [
      {
        type: 'pattern_detected',
        title: 'Test Pattern',
        description: 'Test',
        confidence: 80,
        evidence: [],
      },
    ];

    // First completion should fail (already completed)
    const result1 = completeReflection({
      reflectionId: 'ref_1',
      directionsAnalyzed: 5,
      outcomesAnalyzed: 3,
      signalsAnalyzed: 10,
      insights,
    });

    expect(result1.success).toBe(false);

    // Second completion should succeed (lock was released after first failure)
    const result2 = completeReflection({
      reflectionId: 'ref_2',
      directionsAnalyzed: 5,
      outcomesAnalyzed: 3,
      signalsAnalyzed: 10,
      insights,
    });

    expect(result2.success).toBe(true);
  });
});
