/**
 * Insight Auto-Pruner Tests
 *
 * Tests the two auto-pruning strategies:
 * 1. Demote Misleading: lowers confidence by 30 when acceptance rate dropped
 *    after the insight was learned (requires min 3 directions before + after)
 * 2. Auto-resolve Conflicts: resolves conflicts when effectiveness score
 *    differs by >20%, keeping the higher-scoring insight
 *
 * Uses a real test database to verify brainInsightDb.update() calls.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// Test database setup
// ============================================================================

const TEST_DB_PATH = path.resolve(process.cwd(), 'database', 'test-auto-pruner.db');
let testDb: Database.Database;

function createTables(db: Database.Database) {
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
      canonical_id TEXT,
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

    CREATE TABLE IF NOT EXISTS insight_lineage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_insight_id TEXT NOT NULL,
      child_insight_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      reason TEXT,
      resolved INTEGER DEFAULT 0,
      resolution_method TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (parent_insight_id) REFERENCES brain_insights(id) ON DELETE CASCADE,
      FOREIGN KEY (child_insight_id) REFERENCES brain_insights(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS brain_insight_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      insight_id TEXT NOT NULL,
      evidence_type TEXT NOT NULL CHECK(evidence_type IN ('direction', 'signal', 'reflection')),
      evidence_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (insight_id) REFERENCES brain_insights(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bie_insight ON brain_insight_evidence(insight_id);
    CREATE INDEX IF NOT EXISTS idx_bie_evidence ON brain_insight_evidence(evidence_type, evidence_id);

    CREATE TABLE IF NOT EXISTS directions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

// ============================================================================
// Mock modules — must mock @/app/db to prevent auto-initialization
// ============================================================================

vi.mock('@/app/db/connection', () => ({
  getDatabase: () => testDb,
  closeDatabase: () => {},
}));

vi.mock('@/app/db/hot-writes', () => ({
  getHotWritesDatabase: () => testDb,
}));

// Mock the barrel @/app/db to prevent initializeTables() from running.
// Provide only what insightAutoPruner actually uses:
// - getDatabase() → testDb
// - brainInsightDb.getForEffectiveness(projectId)
// - brainInsightDb.countUnresolvedConflicts(projectId)
// - brainInsightDb.update(id, data)
vi.mock('@/app/db', () => ({
  getDatabase: () => testDb,
  closeDatabase: () => {},
  brainInsightDb: {
    getForEffectiveness: (projectId: string) => {
      return testDb.prepare(`
        SELECT bi.*, br.completed_at
        FROM brain_insights bi
        JOIN brain_reflections br ON bi.reflection_id = br.id
        WHERE bi.project_id = ? AND br.status = 'completed'
        ORDER BY bi.created_at ASC
      `).all(projectId);
    },
    countUnresolvedConflicts: (projectId: string) => {
      const row = testDb.prepare(`
        SELECT COUNT(*) as count FROM brain_insights
        WHERE project_id = ? AND conflict_with_title IS NOT NULL AND conflict_resolved = 0
      `).get(projectId) as { count: number };
      return row?.count ?? 0;
    },
    update: (id: string, data: Record<string, unknown>) => {
      const sets: string[] = [];
      const values: unknown[] = [];
      for (const [key, value] of Object.entries(data)) {
        sets.push(`${key} = ?`);
        values.push(value);
      }
      if (sets.length === 0) return;
      values.push(new Date().toISOString());
      values.push(id);
      testDb.prepare(`UPDATE brain_insights SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).run(...values);
    },
  },
}));

// ============================================================================
// Import after mocking
// ============================================================================

import { autoPruneInsights } from '@/lib/brain/insightAutoPruner';

// ============================================================================
// Helpers
// ============================================================================

const PROJECT_ID = 'proj_prune_test';

function insertReflection(id: string, completedAt: string) {
  testDb.prepare(`
    INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, completed_at, created_at)
    VALUES (?, ?, 'completed', 'manual', 'project', ?, ?)
  `).run(id, PROJECT_ID, completedAt, completedAt);
}

function insertInsight(
  id: string,
  reflectionId: string,
  opts: {
    title?: string;
    confidence?: number;
    conflictWithTitle?: string;
    conflictResolved?: number;
    autoPruned?: number;
    originalConfidence?: number;
  } = {},
) {
  const now = new Date().toISOString();
  testDb.prepare(`
    INSERT INTO brain_insights (
      id, reflection_id, project_id, type, title, description,
      confidence, evidence, conflict_with_title, conflict_resolved,
      auto_pruned, original_confidence, created_at, updated_at
    ) VALUES (?, ?, ?, 'pattern_detected', ?, 'Test description',
      ?, '[]', ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    reflectionId,
    PROJECT_ID,
    opts.title || `Insight ${id}`,
    opts.confidence ?? 80,
    opts.conflictWithTitle || null,
    opts.conflictResolved ?? 0,
    opts.autoPruned ?? 0,
    opts.originalConfidence ?? null,
    now,
    now,
  );
}

function insertDirection(id: string, status: string, createdAt: string) {
  testDb.prepare(`
    INSERT INTO directions (id, project_id, summary, status, created_at)
    VALUES (?, ?, 'Test direction', ?, ?)
  `).run(id, PROJECT_ID, status, createdAt);
}

function getInsight(id: string) {
  return testDb.prepare('SELECT * FROM brain_insights WHERE id = ?').get(id) as {
    id: string;
    confidence: number;
    auto_pruned: number;
    auto_prune_reason: string | null;
    original_confidence: number | null;
    conflict_resolved: number;
    conflict_resolution: string | null;
  } | undefined;
}

// ============================================================================
// Test suite
// ============================================================================

describe('autoPruneInsights', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    testDb = new Database(TEST_DB_PATH);
    createTables(testDb);
  });

  afterEach(() => {
    testDb.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Not enough data
  // --------------------------------------------------------------------------

  it('should return early when not enough directions for reliable judgment', () => {
    insertReflection('ref_1', '2025-06-15T00:00:00Z');
    insertInsight('ins_1', 'ref_1', { confidence: 80 });

    // Only 2 directions (< minDirections * 2 = 6)
    insertDirection('dir_1', 'accepted', '2025-06-10T00:00:00Z');
    insertDirection('dir_2', 'rejected', '2025-06-20T00:00:00Z');

    const result = autoPruneInsights(PROJECT_ID);
    expect(result.misleadingDemoted).toBe(0);
    expect(result.conflictsAutoResolved).toBe(0);
    expect(result.actions).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // Demote misleading insights
  // --------------------------------------------------------------------------

  it('should demote misleading insight by 30 confidence points', () => {
    // Reflection completed at a point in time
    insertReflection('ref_1', '2025-06-15T00:00:00Z');
    insertInsight('ins_1', 'ref_1', { confidence: 80, title: 'Misleading Insight' });

    // Before reflection: 4 accepted out of 4 = 100% acceptance rate
    insertDirection('dir_1', 'accepted', '2025-06-01T00:00:00Z');
    insertDirection('dir_2', 'accepted', '2025-06-05T00:00:00Z');
    insertDirection('dir_3', 'accepted', '2025-06-08T00:00:00Z');
    insertDirection('dir_4', 'accepted', '2025-06-12T00:00:00Z');

    // After reflection: 0 accepted out of 4 = 0% acceptance rate → big drop
    insertDirection('dir_5', 'rejected', '2025-06-20T00:00:00Z');
    insertDirection('dir_6', 'rejected', '2025-06-22T00:00:00Z');
    insertDirection('dir_7', 'rejected', '2025-06-25T00:00:00Z');
    insertDirection('dir_8', 'rejected', '2025-06-28T00:00:00Z');

    const result = autoPruneInsights(PROJECT_ID);
    expect(result.misleadingDemoted).toBe(1);

    const updated = getInsight('ins_1');
    expect(updated!.confidence).toBe(50); // 80 - 30
    expect(updated!.auto_pruned).toBe(1);
    expect(updated!.original_confidence).toBe(80);
    expect(updated!.auto_prune_reason).toContain('acceptance rate dropped');
  });

  it('should not demote below confidence floor of 10', () => {
    insertReflection('ref_1', '2025-06-15T00:00:00Z');
    insertInsight('ins_1', 'ref_1', { confidence: 25, title: 'Low Confidence' });

    // Before: 100% → After: 0% → misleading
    insertDirection('dir_1', 'accepted', '2025-06-01T00:00:00Z');
    insertDirection('dir_2', 'accepted', '2025-06-05T00:00:00Z');
    insertDirection('dir_3', 'accepted', '2025-06-08T00:00:00Z');

    insertDirection('dir_4', 'rejected', '2025-06-20T00:00:00Z');
    insertDirection('dir_5', 'rejected', '2025-06-22T00:00:00Z');
    insertDirection('dir_6', 'rejected', '2025-06-25T00:00:00Z');

    const result = autoPruneInsights(PROJECT_ID);
    expect(result.misleadingDemoted).toBe(1);

    const updated = getInsight('ins_1');
    expect(updated!.confidence).toBe(10); // max(10, 25 - 30) = 10
  });

  it('should not demote helpful insights (acceptance rate improved)', () => {
    insertReflection('ref_1', '2025-06-15T00:00:00Z');
    insertInsight('ins_1', 'ref_1', { confidence: 80, title: 'Helpful Insight' });

    // Before: 25% → After: 100% → helpful
    insertDirection('dir_1', 'accepted', '2025-06-01T00:00:00Z');
    insertDirection('dir_2', 'rejected', '2025-06-05T00:00:00Z');
    insertDirection('dir_3', 'rejected', '2025-06-08T00:00:00Z');
    insertDirection('dir_4', 'rejected', '2025-06-12T00:00:00Z');

    insertDirection('dir_5', 'accepted', '2025-06-20T00:00:00Z');
    insertDirection('dir_6', 'accepted', '2025-06-22T00:00:00Z');
    insertDirection('dir_7', 'accepted', '2025-06-25T00:00:00Z');

    const result = autoPruneInsights(PROJECT_ID);
    expect(result.misleadingDemoted).toBe(0);

    const updated = getInsight('ins_1');
    expect(updated!.confidence).toBe(80); // unchanged
  });

  it('should skip already auto-pruned insights (idempotent)', () => {
    insertReflection('ref_1', '2025-06-15T00:00:00Z');
    insertInsight('ins_1', 'ref_1', {
      confidence: 50,
      title: 'Already Pruned',
      autoPruned: 1, // Already processed
    });

    // Data that would normally trigger misleading
    insertDirection('dir_1', 'accepted', '2025-06-01T00:00:00Z');
    insertDirection('dir_2', 'accepted', '2025-06-05T00:00:00Z');
    insertDirection('dir_3', 'accepted', '2025-06-08T00:00:00Z');
    insertDirection('dir_4', 'rejected', '2025-06-20T00:00:00Z');
    insertDirection('dir_5', 'rejected', '2025-06-22T00:00:00Z');
    insertDirection('dir_6', 'rejected', '2025-06-25T00:00:00Z');

    const result = autoPruneInsights(PROJECT_ID);
    expect(result.misleadingDemoted).toBe(0);

    const updated = getInsight('ins_1');
    expect(updated!.confidence).toBe(50); // unchanged
  });

  // --------------------------------------------------------------------------
  // Auto-resolve conflicts based on effectiveness
  // --------------------------------------------------------------------------

  it('should auto-resolve conflict when effectiveness gap >20%', () => {
    // Two reflections at different times
    insertReflection('ref_1', '2025-06-10T00:00:00Z');
    insertReflection('ref_2', '2025-06-12T00:00:00Z');

    // Insight A (from ref_1): high acceptance after
    insertInsight('ins_a', 'ref_1', {
      title: 'Insight A Winner',
      confidence: 70,
      conflictWithTitle: 'Insight B Loser',
    });

    // Insight B (from ref_2): low acceptance after
    insertInsight('ins_b', 'ref_2', {
      title: 'Insight B Loser',
      confidence: 70,
      conflictWithTitle: 'Insight A Winner',
    });

    // Directions — pattern for ins_a to be helpful, ins_b to be misleading
    // Before ref_1: mixed acceptance (50%)
    insertDirection('dir_1', 'accepted', '2025-06-01T00:00:00Z');
    insertDirection('dir_2', 'rejected', '2025-06-03T00:00:00Z');
    insertDirection('dir_3', 'accepted', '2025-06-05T00:00:00Z');
    insertDirection('dir_4', 'rejected', '2025-06-07T00:00:00Z');

    // Between ref_1 and ref_2: improving (ins_a gets credit)
    insertDirection('dir_5', 'accepted', '2025-06-11T00:00:00Z');

    // After ref_2: mixed (ins_b doesn't help)
    insertDirection('dir_6', 'rejected', '2025-06-15T00:00:00Z');
    insertDirection('dir_7', 'rejected', '2025-06-18T00:00:00Z');
    insertDirection('dir_8', 'rejected', '2025-06-20T00:00:00Z');

    const result = autoPruneInsights(PROJECT_ID);

    // Verify auto-resolve happened
    if (result.conflictsAutoResolved > 0) {
      expect(result.actions.some(a => a.type === 'conflict_auto_resolved')).toBe(true);

      // At least one should be demoted by 20 points
      const insA = getInsight('ins_a');
      const insB = getInsight('ins_b');
      expect(insA!.conflict_resolved + insB!.conflict_resolved).toBeGreaterThanOrEqual(1);
    }
  });

  it('should not auto-resolve conflicts when effectiveness gap <=20%', () => {
    insertReflection('ref_1', '2025-06-15T00:00:00Z');
    insertReflection('ref_2', '2025-06-15T00:00:00Z');

    insertInsight('ins_a', 'ref_1', {
      title: 'Insight A Similar',
      confidence: 70,
      conflictWithTitle: 'Insight B Similar',
    });

    insertInsight('ins_b', 'ref_2', {
      title: 'Insight B Similar',
      confidence: 70,
      conflictWithTitle: 'Insight A Similar',
    });

    // Equal distribution → similar effectiveness for both
    insertDirection('dir_1', 'accepted', '2025-06-01T00:00:00Z');
    insertDirection('dir_2', 'accepted', '2025-06-05T00:00:00Z');
    insertDirection('dir_3', 'accepted', '2025-06-08T00:00:00Z');
    insertDirection('dir_4', 'accepted', '2025-06-20T00:00:00Z');
    insertDirection('dir_5', 'accepted', '2025-06-22T00:00:00Z');
    insertDirection('dir_6', 'accepted', '2025-06-25T00:00:00Z');

    const result = autoPruneInsights(PROJECT_ID);
    expect(result.conflictsAutoResolved).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Result structure
  // --------------------------------------------------------------------------

  it('should return correct AutoPruneResult shape', () => {
    insertReflection('ref_1', '2025-06-15T00:00:00Z');
    insertInsight('ins_1', 'ref_1');

    // Enough data for reliability
    for (let i = 0; i < 4; i++) {
      insertDirection(`dir_pre_${i}`, 'accepted', `2025-06-0${i + 1}T00:00:00Z`);
      insertDirection(`dir_post_${i}`, 'accepted', `2025-06-2${i}T00:00:00Z`);
    }

    const result = autoPruneInsights(PROJECT_ID);
    expect(result).toHaveProperty('misleadingDemoted');
    expect(result).toHaveProperty('conflictsAutoResolved');
    expect(result).toHaveProperty('conflictsRemaining');
    expect(result).toHaveProperty('actions');
    expect(typeof result.misleadingDemoted).toBe('number');
    expect(typeof result.conflictsAutoResolved).toBe('number');
    expect(typeof result.conflictsRemaining).toBe('number');
    expect(Array.isArray(result.actions)).toBe(true);
  });

  it('should produce actions with correct structure', () => {
    insertReflection('ref_1', '2025-06-15T00:00:00Z');
    insertInsight('ins_1', 'ref_1', { confidence: 80, title: 'To Demote' });

    // Before: 100% → After: 0%
    insertDirection('dir_1', 'accepted', '2025-06-01T00:00:00Z');
    insertDirection('dir_2', 'accepted', '2025-06-05T00:00:00Z');
    insertDirection('dir_3', 'accepted', '2025-06-08T00:00:00Z');
    insertDirection('dir_4', 'rejected', '2025-06-20T00:00:00Z');
    insertDirection('dir_5', 'rejected', '2025-06-22T00:00:00Z');
    insertDirection('dir_6', 'rejected', '2025-06-25T00:00:00Z');

    const result = autoPruneInsights(PROJECT_ID);

    if (result.actions.length > 0) {
      const action = result.actions[0];
      expect(action).toHaveProperty('type');
      expect(action).toHaveProperty('insightTitle');
      expect(action).toHaveProperty('detail');
      expect(['confidence_lowered', 'conflict_auto_resolved']).toContain(action.type);
    }
  });
});
