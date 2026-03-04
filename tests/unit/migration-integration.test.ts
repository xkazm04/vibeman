/**
 * Integration test for migration 137
 * Verifies the migration can be imported and run alongside other migrations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { migrate135BrainInsightEvidenceJunction } from '@/app/db/migrations/135_brain_insight_evidence_junction';
import { migrate137CascadeDeleteEvidenceJunction } from '@/app/db/migrations/137_cascade_delete_evidence_junction';

describe('Migration 137 Integration', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');

    // Setup minimal schema
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
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE brain_reflections (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        trigger_type TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE behavioral_signals (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  });

  afterEach(() => {
    db.close();
  });

  it('should run migration 137 successfully after migration 135', () => {
    // Run migrations in sequence
    expect(() => migrate135BrainInsightEvidenceJunction(db as any)).not.toThrow();
    expect(() => migrate137CascadeDeleteEvidenceJunction(db as any)).not.toThrow();

    // Verify junction table exists
    const table = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='brain_insight_evidence'`)
      .get() as { name: string } | undefined;
    expect(table).toBeDefined();
    expect(table?.name).toBe('brain_insight_evidence');

    // Verify triggers exist
    const triggers = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name`)
      .all() as Array<{ name: string }>;

    const triggerNames = triggers.map(t => t.name);
    expect(triggerNames).toContain('trigger_delete_direction_evidence');
    expect(triggerNames).toContain('trigger_delete_reflection_evidence');
    expect(triggerNames).toContain('trigger_delete_signal_evidence');
  });

  it('should be idempotent - running twice should not cause errors', () => {
    // Run migrations twice
    expect(() => migrate135BrainInsightEvidenceJunction(db as any)).not.toThrow();
    expect(() => migrate137CascadeDeleteEvidenceJunction(db as any)).not.toThrow();
    expect(() => migrate137CascadeDeleteEvidenceJunction(db as any)).not.toThrow();

    // Should still have exactly 3 triggers
    const triggers = db
      .prepare(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='trigger'`)
      .get() as { count: number };
    expect(triggers.count).toBe(3);
  });
});
