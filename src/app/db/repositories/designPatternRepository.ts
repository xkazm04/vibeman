/**
 * Repository for learned design patterns (connector-agnostic).
 */

import { getConnection } from '../drivers';

function generateId(): string {
  return 'pdpat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export const designPatternRepository = {
  /** Get all active patterns, ordered by confidence DESC */
  getActive(): Record<string, unknown>[] {
    const db = getConnection();
    return db.prepare(
      'SELECT * FROM persona_design_patterns WHERE is_active = 1 ORDER BY confidence DESC, last_validated_at DESC'
    ).all() as Record<string, unknown>[];
  },

  /** Get all patterns (active and inactive) */
  getAll(): Record<string, unknown>[] {
    const db = getConnection();
    return db.prepare('SELECT * FROM persona_design_patterns ORDER BY is_active DESC, confidence DESC').all() as Record<string, unknown>[];
  },

  /** Find pattern by trigger_condition (for dedup) */
  getByTriggerCondition(triggerCondition: string): Record<string, unknown> | undefined {
    const db = getConnection();
    return db.prepare('SELECT * FROM persona_design_patterns WHERE trigger_condition = ?').get(triggerCondition) as Record<string, unknown> | undefined;
  },

  /** Create a new pattern */
  create(pattern: {
    pattern_type: string;
    pattern_text: string;
    trigger_condition: string;
    confidence: number;
    source_review_ids: string;
    is_active: number;
  }): Record<string, unknown> {
    const db = getConnection();
    const id = generateId();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO persona_design_patterns
        (id, pattern_type, pattern_text, trigger_condition, confidence, source_review_ids,
         usage_count, last_validated_at, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(
      id, pattern.pattern_type, pattern.pattern_text, pattern.trigger_condition,
      pattern.confidence, pattern.source_review_ids, now, pattern.is_active, now
    );
    return { id, ...pattern, usage_count: 0, last_validated_at: now, created_at: now };
  },

  /** Add a source review and bump confidence. Activate if confidence >= 2 */
  addValidation(id: string, reviewId: string): void {
    const db = getConnection();
    const row = db.prepare('SELECT source_review_ids, confidence FROM persona_design_patterns WHERE id = ?').get(id) as { source_review_ids: string; confidence: number } | undefined;
    if (!row) return;

    let sourceIds: string[];
    try { sourceIds = JSON.parse(row.source_review_ids); } catch { sourceIds = []; }
    if (!sourceIds.includes(reviewId)) {
      sourceIds.push(reviewId);
    }

    const newConfidence = sourceIds.length;
    const isActive = newConfidence >= 2 ? 1 : 0;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE persona_design_patterns
      SET source_review_ids = ?, confidence = ?, is_active = ?, last_validated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(sourceIds), newConfidence, isActive, now, id);
  },

  /** Increment usage count (called when pattern is injected into a design prompt) */
  incrementUsage(id: string): void {
    const db = getConnection();
    db.prepare('UPDATE persona_design_patterns SET usage_count = usage_count + 1 WHERE id = ?').run(id);
  },

  /** Deactivate patterns not validated within the given number of days */
  deactivateStale(maxAgeDays: number): number {
    const db = getConnection();
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
    const result = db.prepare(
      'UPDATE persona_design_patterns SET is_active = 0 WHERE is_active = 1 AND last_validated_at < ?'
    ).run(cutoff);
    return (result as { changes: number }).changes;
  },

  /** Deactivate all patterns (kill switch) */
  deactivateAll(): number {
    const db = getConnection();
    const result = db.prepare('UPDATE persona_design_patterns SET is_active = 0 WHERE is_active = 1').run();
    return (result as { changes: number }).changes;
  },

  /** Count active patterns */
  countActive(): number {
    const db = getConnection();
    const row = db.prepare('SELECT COUNT(*) as cnt FROM persona_design_patterns WHERE is_active = 1').get() as { cnt: number };
    return row.cnt;
  },

  /** Get the least-confident active pattern (for eviction when at cap) */
  getLeastConfidentActive(): Record<string, unknown> | undefined {
    const db = getConnection();
    return db.prepare(
      'SELECT * FROM persona_design_patterns WHERE is_active = 1 ORDER BY confidence ASC, last_validated_at ASC LIMIT 1'
    ).get() as Record<string, unknown> | undefined;
  },

  /** Delete a pattern by ID */
  delete(id: string): void {
    const db = getConnection();
    db.prepare('DELETE FROM persona_design_patterns WHERE id = ?').run(id);
  },
};
