/**
 * Brain Insight Evidence Junction Table Test
 *
 * Tests that the junction table properly:
 * - Stores evidence references during insight creation
 * - Enables reverse lookups (find insights citing evidence X)
 * - Replaces 3 separate queries with a single JOIN
 * - Supports cache invalidation targeting specific evidence chains
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import type { EvidenceRef } from '@/app/db/models/brain.types';

// ============================================================================
// Test database setup
// ============================================================================

const TEST_DB_PATH = path.resolve(process.cwd(), 'database', 'test-brain-junction.db');
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

    CREATE INDEX idx_bie_insight ON brain_insight_evidence(insight_id);
    CREATE INDEX idx_bie_evidence ON brain_insight_evidence(evidence_type, evidence_id);
    CREATE INDEX idx_bie_insight_type ON brain_insight_evidence(insight_id, evidence_type);

    CREATE TABLE IF NOT EXISTS directions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      context_name TEXT,
      context_map_title TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS behavioral_signals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      context_id TEXT,
      context_name TEXT,
      data TEXT,
      weight REAL DEFAULT 1.0,
      timestamp TEXT NOT NULL,
      decay_applied_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

vi.mock('@/app/db/hot-writes', () => ({
  getHotWritesDatabase: () => testDb,
}));

// ============================================================================
// Import repository after mocking
// ============================================================================

import { brainInsightRepository } from '@/app/db/repositories/brain-insight.repository';
import { InsightDeduplicator } from '@/lib/brain/InsightDeduplicator';

// ============================================================================
// Test suite
// ============================================================================

describe('Brain Insight Evidence Junction Table', () => {
  beforeEach(() => {
    // Create fresh test DB
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    testDb = new Database(TEST_DB_PATH);
    createBrainTables(testDb);

    // Seed test data
    const now = new Date().toISOString();

    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_test', 'proj_1', 'completed', 'manual', 'project', now);

    testDb.prepare(`
      INSERT INTO directions (id, project_id, summary, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('dir_001', 'proj_1', 'Direction 1 summary', 'accepted', now);

    testDb.prepare(`
      INSERT INTO directions (id, project_id, summary, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('dir_002', 'proj_1', 'Direction 2 summary', 'accepted', now);

    // Seed behavioral signals for FK validation
    const signalStmt = testDb.prepare(`
      INSERT INTO behavioral_signals (id, project_id, signal_type, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const sigId of ['sig_123', 'sig_456', 'sig_789', 'sig_abc', 'sig_any_id']) {
      signalStmt.run(sigId, 'proj_1', 'git_activity', now, now);
    }
  });

  afterEach(() => {
    testDb.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('should create insight with evidence in junction table', () => {
    const evidence: EvidenceRef[] = [
      { type: 'direction', id: 'dir_001' },
      { type: 'direction', id: 'dir_002' },
      { type: 'signal', id: 'sig_123' },
    ];

    const insight = brainInsightRepository.create({
      id: 'bi_test',
      reflection_id: 'ref_test',
      project_id: 'proj_1',
      type: 'pattern_detected',
      title: 'Test Pattern',
      description: 'A test pattern',
      confidence: 80,
      evidence,
    });

    expect(insight.id).toBe('bi_test');

    // Check junction table has 3 rows
    const junctionRows = testDb.prepare(
      'SELECT * FROM brain_insight_evidence WHERE insight_id = ?'
    ).all('bi_test') as Array<{ insight_id: string; evidence_type: string; evidence_id: string }>;

    expect(junctionRows).toHaveLength(3);
    expect(junctionRows[0]).toMatchObject({
      insight_id: 'bi_test',
      evidence_type: 'direction',
      evidence_id: 'dir_001',
    });
    expect(junctionRows[1]).toMatchObject({
      insight_id: 'bi_test',
      evidence_type: 'direction',
      evidence_id: 'dir_002',
    });
    expect(junctionRows[2]).toMatchObject({
      insight_id: 'bi_test',
      evidence_type: 'signal',
      evidence_id: 'sig_123',
    });
  });

  it('should find insights by evidence (reverse lookup)', () => {
    // Create two insights citing the same direction
    brainInsightRepository.create({
      id: 'bi_1',
      reflection_id: 'ref_test',
      project_id: 'proj_1',
      type: 'pattern_detected',
      title: 'Pattern 1',
      description: 'First pattern',
      confidence: 75,
      evidence: [{ type: 'direction', id: 'dir_001' }],
    });

    brainInsightRepository.create({
      id: 'bi_2',
      reflection_id: 'ref_test',
      project_id: 'proj_1',
      type: 'pattern_detected',
      title: 'Pattern 2',
      description: 'Second pattern',
      confidence: 85,
      evidence: [
        { type: 'direction', id: 'dir_001' },
        { type: 'direction', id: 'dir_002' },
      ],
    });

    // Query insights citing dir_001
    const insights = brainInsightRepository.getByEvidence('direction', 'dir_001');
    expect(insights).toHaveLength(2);
    expect(insights.map(i => i.id).sort()).toEqual(['bi_1', 'bi_2']);

    // Query insights citing dir_002
    const insights2 = brainInsightRepository.getByEvidence('direction', 'dir_002');
    expect(insights2).toHaveLength(1);
    expect(insights2[0].id).toBe('bi_2');
  });

  it('should get evidence for insight from junction table', () => {
    // Create a valid reflection for evidence reference
    const now = new Date().toISOString();
    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_old', 'proj_1', 'completed', 'manual', 'project', now);

    const evidence: EvidenceRef[] = [
      { type: 'direction', id: 'dir_001' },
      { type: 'signal', id: 'sig_456' },
      { type: 'reflection', id: 'ref_old' },
    ];

    brainInsightRepository.create({
      id: 'bi_test',
      reflection_id: 'ref_test',
      project_id: 'proj_1',
      type: 'recommendation',
      title: 'Test Recommendation',
      description: 'A test',
      confidence: 70,
      evidence,
    });

    const retrieved = brainInsightRepository.getEvidenceForInsight('bi_test');
    expect(retrieved).toHaveLength(3);
    expect(retrieved).toEqual(evidence);
  });

  it('should count insights by evidence', () => {
    brainInsightRepository.create({
      id: 'bi_1',
      reflection_id: 'ref_test',
      project_id: 'proj_1',
      type: 'pattern_detected',
      title: 'Pattern 1',
      description: 'First',
      confidence: 60,
      evidence: [{ type: 'direction', id: 'dir_001' }],
    });

    brainInsightRepository.create({
      id: 'bi_2',
      reflection_id: 'ref_test',
      project_id: 'proj_1',
      type: 'pattern_detected',
      title: 'Pattern 2',
      description: 'Second',
      confidence: 70,
      evidence: [{ type: 'direction', id: 'dir_001' }],
    });

    const count = brainInsightRepository.countByEvidence('direction', 'dir_001');
    expect(count).toBe(2);

    const count2 = brainInsightRepository.countByEvidence('direction', 'dir_002');
    expect(count2).toBe(0);
  });

  it('should cascade delete evidence when insight is deleted', () => {
    brainInsightRepository.create({
      id: 'bi_test',
      reflection_id: 'ref_test',
      project_id: 'proj_1',
      type: 'warning',
      title: 'Test Warning',
      description: 'A warning',
      confidence: 90,
      evidence: [
        { type: 'direction', id: 'dir_001' },
        { type: 'signal', id: 'sig_789' },
      ],
    });

    // Verify evidence exists
    let junctionRows = testDb.prepare(
      'SELECT COUNT(*) as count FROM brain_insight_evidence WHERE insight_id = ?'
    ).get('bi_test') as { count: number };
    expect(junctionRows.count).toBe(2);

    // Delete insight
    brainInsightRepository.delete('bi_test');

    // Verify evidence was cascade deleted
    junctionRows = testDb.prepare(
      'SELECT COUNT(*) as count FROM brain_insight_evidence WHERE insight_id = ?'
    ).get('bi_test') as { count: number };
    expect(junctionRows.count).toBe(0);
  });

  it('should support batch create with junction table', () => {
    const deduplicator = new InsightDeduplicator('proj_1', []);
    const insights = brainInsightRepository.createBatch('ref_test', 'proj_1', [
      {
        type: 'pattern_detected',
        title: 'Batch Pattern 1',
        description: 'First batch',
        confidence: 65,
        evidence: [{ type: 'direction', id: 'dir_001' }],
      },
      {
        type: 'pattern_detected',
        title: 'Batch Pattern 2',
        description: 'Second batch',
        confidence: 75,
        evidence: [
          { type: 'direction', id: 'dir_002' },
          { type: 'signal', id: 'sig_abc' },
        ],
      },
    ], deduplicator);

    expect(insights).toHaveLength(2);

    // Verify junction table
    const totalEvidence = testDb.prepare(
      'SELECT COUNT(*) as count FROM brain_insight_evidence'
    ).get() as { count: number };
    expect(totalEvidence.count).toBe(3); // 1 + 2
  });

  it('should handle empty evidence array', () => {
    const insight = brainInsightRepository.create({
      id: 'bi_empty',
      reflection_id: 'ref_test',
      project_id: 'proj_1',
      type: 'recommendation',
      title: 'No Evidence',
      description: 'No evidence',
      confidence: 50,
      evidence: [],
    });

    expect(insight.id).toBe('bi_empty');

    const junctionRows = testDb.prepare(
      'SELECT COUNT(*) as count FROM brain_insight_evidence WHERE insight_id = ?'
    ).get('bi_empty') as { count: number };
    expect(junctionRows.count).toBe(0);
  });

  it('should skip missing evidence references and still create the insight', () => {
    // Create insight with one valid and one non-existent direction reference
    const insight = brainInsightRepository.create({
      id: 'bi_invalid',
      reflection_id: 'ref_test',
      project_id: 'proj_1',
      type: 'pattern_detected',
      title: 'Invalid Pattern',
      description: 'Should succeed with partial evidence',
      confidence: 80,
      evidence: [
        { type: 'direction', id: 'dir_001' }, // exists
        { type: 'direction', id: 'dir_nonexistent' }, // does not exist — skipped
      ],
    });

    // Insight is created (missing evidence is skipped, not rolled back)
    expect(insight).toBeDefined();
    expect(insight.id).toBe('bi_invalid');

    // Only the valid evidence reference should be in the junction table
    const junctionRows = testDb.prepare(
      'SELECT COUNT(*) as count FROM brain_insight_evidence WHERE insight_id = ?'
    ).get('bi_invalid') as { count: number };
    expect(junctionRows.count).toBe(1);
  });

  it('should create batch with missing evidence skipped (not rolled back)', () => {
    const initialCount = (testDb.prepare('SELECT COUNT(*) as count FROM brain_insights').get() as { count: number }).count;
    const deduplicator = new InsightDeduplicator('proj_1', []);

    // Create batch — invalid evidence references are skipped, not thrown
    const results = brainInsightRepository.createBatch('ref_test', 'proj_1', [
      {
        type: 'pattern_detected',
        title: 'Valid Pattern 1',
        description: 'First valid',
        confidence: 75,
        evidence: [{ type: 'direction', id: 'dir_001' }],
      },
      {
        type: 'pattern_detected',
        title: 'Invalid Pattern',
        description: 'Has invalid evidence',
        confidence: 85,
        evidence: [
          { type: 'direction', id: 'dir_002' }, // exists
          { type: 'reflection', id: 'ref_nonexistent' }, // does not exist — skipped
        ],
      },
      {
        type: 'recommendation',
        title: 'Valid Pattern 2',
        description: 'Second valid',
        confidence: 70,
        evidence: [{ type: 'direction', id: 'dir_001' }],
      },
    ], deduplicator);

    // All insights are created (missing evidence is skipped)
    const finalCount = (testDb.prepare('SELECT COUNT(*) as count FROM brain_insights').get() as { count: number }).count;
    expect(finalCount).toBe(initialCount + 3);
    expect(results).toHaveLength(3);
  });

  it('should validate reflection evidence references', () => {
    // Create a valid reflection first
    const now = new Date().toISOString();
    testDb.prepare(`
      INSERT INTO brain_reflections (id, project_id, status, trigger_type, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ref_valid', 'proj_1', 'completed', 'manual', 'project', now);

    // Should succeed with valid reflection reference
    const insight = brainInsightRepository.create({
      id: 'bi_valid_ref',
      reflection_id: 'ref_test',
      project_id: 'proj_1',
      type: 'pattern_detected',
      title: 'Valid Reflection Evidence',
      description: 'Should succeed',
      confidence: 80,
      evidence: [{ type: 'reflection', id: 'ref_valid' }],
    });

    expect(insight.id).toBe('bi_valid_ref');

    // Invalid reflection reference is skipped (insight still created, no junction row)
    const insight2 = brainInsightRepository.create({
      id: 'bi_invalid_ref',
      reflection_id: 'ref_test',
      project_id: 'proj_1',
      type: 'pattern_detected',
      title: 'Invalid Reflection Evidence',
      description: 'Should succeed with skipped evidence',
      confidence: 80,
      evidence: [{ type: 'reflection', id: 'ref_invalid' }],
    });
    expect(insight2.id).toBe('bi_invalid_ref');
    const junctionCount = testDb.prepare(
      'SELECT COUNT(*) as count FROM brain_insight_evidence WHERE insight_id = ?'
    ).get('bi_invalid_ref') as { count: number };
    expect(junctionCount.count).toBe(0);
  });

  it('should validate signal evidence against hot-writes DB', () => {
    // Signals are now validated against the behavioral_signals table in hot-writes DB
    const insight = brainInsightRepository.create({
      id: 'bi_signal',
      reflection_id: 'ref_test',
      project_id: 'proj_1',
      type: 'pattern_detected',
      title: 'Signal Pattern',
      description: 'With signal evidence',
      confidence: 80,
      evidence: [
        { type: 'signal', id: 'sig_123' },
        { type: 'signal', id: 'sig_any_id' },
      ],
    });

    expect(insight.id).toBe('bi_signal');

    const junctionRows = testDb.prepare(
      'SELECT COUNT(*) as count FROM brain_insight_evidence WHERE insight_id = ?'
    ).get('bi_signal') as { count: number };
    expect(junctionRows.count).toBe(2);
  });

  it('should skip signal evidence with non-existent signal ID', () => {
    const insight = brainInsightRepository.create({
      id: 'bi_bad_signal',
      reflection_id: 'ref_test',
      project_id: 'proj_1',
      type: 'pattern_detected',
      title: 'Bad Signal',
      description: 'Should succeed with skipped evidence',
      confidence: 80,
      evidence: [{ type: 'signal', id: 'sig_nonexistent' }],
    });
    expect(insight.id).toBe('bi_bad_signal');
    // Non-existent signal evidence should be skipped
    const junctionRows = testDb.prepare(
      'SELECT COUNT(*) as count FROM brain_insight_evidence WHERE insight_id = ?'
    ).get('bi_bad_signal') as { count: number };
    expect(junctionRows.count).toBe(0);
  });
});
