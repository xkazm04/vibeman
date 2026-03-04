/**
 * Tests for Migration 137: Cascade Delete Evidence Junction
 *
 * Verifies that deleting evidence sources (directions, reflections, signals)
 * automatically cascades to brain_insight_evidence junction table via triggers.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { migrate135BrainInsightEvidenceJunction } from '@/app/db/migrations/135_brain_insight_evidence_junction';
import { migrate137CascadeDeleteEvidenceJunction } from '@/app/db/migrations/137_cascade_delete_evidence_junction';

describe('Migration 137: Cascade Delete Evidence Junction', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create in-memory test database
    db = new Database(':memory:');

    // Create required tables
    db.exec(`
      CREATE TABLE brain_insights (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        insight_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE directions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        context_map_id TEXT NOT NULL,
        context_map_title TEXT NOT NULL,
        direction TEXT NOT NULL,
        summary TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE brain_reflections (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        trigger_type TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'project',
        directions_analyzed INTEGER DEFAULT 0,
        outcomes_analyzed INTEGER DEFAULT 0,
        signals_analyzed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE behavioral_signals (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        context_id TEXT,
        context_name TEXT,
        data TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        timestamp TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Run migrations
    migrate135BrainInsightEvidenceJunction(db as any);
    migrate137CascadeDeleteEvidenceJunction(db as any);
  });

  afterEach(() => {
    db.close();
  });

  it('should create cascade delete triggers', () => {
    const triggers = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'trigger'
         ORDER BY name`
      )
      .all() as Array<{ name: string }>;

    const triggerNames = triggers.map((t) => t.name);
    expect(triggerNames).toContain('trigger_delete_direction_evidence');
    expect(triggerNames).toContain('trigger_delete_reflection_evidence');
    expect(triggerNames).toContain('trigger_delete_signal_evidence');
  });

  it('should cascade delete direction evidence when direction is deleted', () => {
    // Insert test data
    const directionId = 'dir_test_001';
    const insightId = 'ins_test_001';

    db.prepare(
      'INSERT INTO directions (id, project_id, context_map_id, context_map_title, direction, summary) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(directionId, 'proj_1', 'ctx_1', 'Test Context', 'Test direction', 'Summary');

    db.prepare(
      `INSERT INTO brain_insights (id, project_id, insight_type, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(insightId, 'proj_1', 'pattern', 'Test Insight', 'Description');

    db.prepare(
      `INSERT INTO brain_insight_evidence (insight_id, evidence_type, evidence_id, created_at) VALUES (?, ?, ?, datetime('now'))`
    ).run(insightId, 'direction', directionId);

    // Verify evidence exists
    const beforeCount = db
      .prepare('SELECT COUNT(*) as count FROM brain_insight_evidence WHERE evidence_id = ?')
      .get(directionId) as { count: number };
    expect(beforeCount.count).toBe(1);

    // Delete direction
    db.prepare('DELETE FROM directions WHERE id = ?').run(directionId);

    // Verify evidence was cascade deleted
    const afterCount = db
      .prepare('SELECT COUNT(*) as count FROM brain_insight_evidence WHERE evidence_id = ?')
      .get(directionId) as { count: number };
    expect(afterCount.count).toBe(0);
  });

  it('should cascade delete reflection evidence when reflection is deleted', () => {
    // Insert test data
    const reflectionId = 'ref_test_001';
    const insightId = 'ins_test_002';

    db.prepare(
      'INSERT INTO brain_reflections (id, project_id, trigger_type) VALUES (?, ?, ?)'
    ).run(reflectionId, 'proj_1', 'manual');

    db.prepare(
      `INSERT INTO brain_insights (id, project_id, insight_type, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(insightId, 'proj_1', 'trend', 'Test Insight', 'Description');

    db.prepare(
      `INSERT INTO brain_insight_evidence (insight_id, evidence_type, evidence_id, created_at) VALUES (?, ?, ?, datetime('now'))`
    ).run(insightId, 'reflection', reflectionId);

    // Verify evidence exists
    const beforeCount = db
      .prepare('SELECT COUNT(*) as count FROM brain_insight_evidence WHERE evidence_id = ?')
      .get(reflectionId) as { count: number };
    expect(beforeCount.count).toBe(1);

    // Delete reflection
    db.prepare('DELETE FROM brain_reflections WHERE id = ?').run(reflectionId);

    // Verify evidence was cascade deleted
    const afterCount = db
      .prepare('SELECT COUNT(*) as count FROM brain_insight_evidence WHERE evidence_id = ?')
      .get(reflectionId) as { count: number };
    expect(afterCount.count).toBe(0);
  });

  it('should cascade delete signal evidence when signal is deleted', () => {
    // Insert test data
    const signalId = 'sig_test_001';
    const insightId = 'ins_test_003';

    db.prepare(
      `INSERT INTO behavioral_signals (id, project_id, signal_type, data, timestamp) VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(signalId, 'proj_1', 'git_activity', '{}');

    db.prepare(
      `INSERT INTO brain_insights (id, project_id, insight_type, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(insightId, 'proj_1', 'pattern', 'Test Insight', 'Description');

    db.prepare(
      `INSERT INTO brain_insight_evidence (insight_id, evidence_type, evidence_id, created_at) VALUES (?, ?, ?, datetime('now'))`
    ).run(insightId, 'signal', signalId);

    // Verify evidence exists
    const beforeCount = db
      .prepare('SELECT COUNT(*) as count FROM brain_insight_evidence WHERE evidence_id = ?')
      .get(signalId) as { count: number };
    expect(beforeCount.count).toBe(1);

    // Delete signal
    db.prepare('DELETE FROM behavioral_signals WHERE id = ?').run(signalId);

    // Verify evidence was cascade deleted
    const afterCount = db
      .prepare('SELECT COUNT(*) as count FROM brain_insight_evidence WHERE evidence_id = ?')
      .get(signalId) as { count: number };
    expect(afterCount.count).toBe(0);
  });

  it('should handle multiple evidence references for same source', () => {
    // Insert test data
    const directionId = 'dir_test_multi';
    const insight1Id = 'ins_test_multi_1';
    const insight2Id = 'ins_test_multi_2';

    db.prepare(
      'INSERT INTO directions (id, project_id, context_map_id, context_map_title, direction, summary) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(directionId, 'proj_1', 'ctx_1', 'Test Context', 'Test direction', 'Summary');

    db.prepare(
      `INSERT INTO brain_insights (id, project_id, insight_type, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(insight1Id, 'proj_1', 'pattern', 'Insight 1', 'Description');

    db.prepare(
      `INSERT INTO brain_insights (id, project_id, insight_type, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(insight2Id, 'proj_1', 'trend', 'Insight 2', 'Description');

    db.prepare(
      `INSERT INTO brain_insight_evidence (insight_id, evidence_type, evidence_id, created_at) VALUES (?, ?, ?, datetime('now'))`
    ).run(insight1Id, 'direction', directionId);

    db.prepare(
      `INSERT INTO brain_insight_evidence (insight_id, evidence_type, evidence_id, created_at) VALUES (?, ?, ?, datetime('now'))`
    ).run(insight2Id, 'direction', directionId);

    // Verify both evidence entries exist
    const beforeCount = db
      .prepare('SELECT COUNT(*) as count FROM brain_insight_evidence WHERE evidence_id = ?')
      .get(directionId) as { count: number };
    expect(beforeCount.count).toBe(2);

    // Delete direction
    db.prepare('DELETE FROM directions WHERE id = ?').run(directionId);

    // Verify all evidence was cascade deleted
    const afterCount = db
      .prepare('SELECT COUNT(*) as count FROM brain_insight_evidence WHERE evidence_id = ?')
      .get(directionId) as { count: number };
    expect(afterCount.count).toBe(0);
  });

  it('should clean up existing orphaned evidence on migration', () => {
    // Temporarily drop triggers to create orphaned data
    db.exec(`
      DROP TRIGGER IF EXISTS trigger_delete_direction_evidence;
      DROP TRIGGER IF EXISTS trigger_delete_reflection_evidence;
      DROP TRIGGER IF EXISTS trigger_delete_signal_evidence;
    `);

    // Insert test data
    const directionId = 'dir_orphan';
    const insightId = 'ins_orphan';

    db.prepare(
      'INSERT INTO directions (id, project_id, context_map_id, context_map_title, direction, summary) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(directionId, 'proj_1', 'ctx_1', 'Test Context', 'Test direction', 'Summary');

    db.prepare(
      `INSERT INTO brain_insights (id, project_id, insight_type, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(insightId, 'proj_1', 'pattern', 'Test Insight', 'Description');

    db.prepare(
      `INSERT INTO brain_insight_evidence (insight_id, evidence_type, evidence_id, created_at) VALUES (?, ?, ?, datetime('now'))`
    ).run(insightId, 'direction', directionId);

    // Delete direction without triggers (creates orphan)
    db.prepare('DELETE FROM directions WHERE id = ?').run(directionId);

    // Verify orphan exists
    const orphanCount = db
      .prepare('SELECT COUNT(*) as count FROM brain_insight_evidence WHERE evidence_id = ?')
      .get(directionId) as { count: number };
    expect(orphanCount.count).toBe(1);

    // Re-run migration (should clean up orphans)
    migrate137CascadeDeleteEvidenceJunction(db as any);

    // Verify orphan was cleaned up
    const afterCleanup = db
      .prepare('SELECT COUNT(*) as count FROM brain_insight_evidence WHERE evidence_id = ?')
      .get(directionId) as { count: number };
    expect(afterCleanup.count).toBe(0);
  });

  it('should not affect evidence when insight is deleted (handled by ON DELETE CASCADE)', () => {
    // This test verifies existing ON DELETE CASCADE on insight_id still works
    const directionId = 'dir_cascade_test';
    const insightId = 'ins_cascade_test';

    db.prepare(
      'INSERT INTO directions (id, project_id, context_map_id, context_map_title, direction, summary) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(directionId, 'proj_1', 'ctx_1', 'Test Context', 'Test direction', 'Summary');

    db.prepare(
      `INSERT INTO brain_insights (id, project_id, insight_type, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(insightId, 'proj_1', 'pattern', 'Test Insight', 'Description');

    db.prepare(
      `INSERT INTO brain_insight_evidence (insight_id, evidence_type, evidence_id, created_at) VALUES (?, ?, ?, datetime('now'))`
    ).run(insightId, 'direction', directionId);

    // Verify evidence exists
    const beforeCount = db
      .prepare('SELECT COUNT(*) as count FROM brain_insight_evidence WHERE insight_id = ?')
      .get(insightId) as { count: number };
    expect(beforeCount.count).toBe(1);

    // Delete insight (should cascade via FK constraint)
    db.prepare('DELETE FROM brain_insights WHERE id = ?').run(insightId);

    // Verify evidence was deleted
    const afterCount = db
      .prepare('SELECT COUNT(*) as count FROM brain_insight_evidence WHERE insight_id = ?')
      .get(insightId) as { count: number };
    expect(afterCount.count).toBe(0);

    // Direction should still exist
    const directionExists = db
      .prepare('SELECT COUNT(*) as count FROM directions WHERE id = ?')
      .get(directionId) as { count: number };
    expect(directionExists.count).toBe(1);
  });
});
