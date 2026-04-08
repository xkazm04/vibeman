/**
 * Insight Annotation Repository
 * CRUD operations for user annotations and custom tags on brain insights.
 */

import { getDatabase } from '../connection';
import type { DbInsightAnnotation, InsightAnnotation } from '../models/brain.types';
import { getCurrentTimestamp, generateId } from './repository.utils';

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

function toAnnotation(row: DbInsightAnnotation): InsightAnnotation {
  return {
    id: row.id,
    insightId: row.insight_id,
    note: row.note,
    tags: parseTags(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const insightAnnotationRepository = {
  /**
   * Get annotation for a specific insight
   */
  getByInsightId(insightId: string): InsightAnnotation | null {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT * FROM brain_insight_annotations WHERE insight_id = ?'
    ).get(insightId) as DbInsightAnnotation | undefined;
    return row ? toAnnotation(row) : null;
  },

  /**
   * Get annotations for multiple insights (batch)
   */
  getByInsightIds(insightIds: string[]): Map<string, InsightAnnotation> {
    if (insightIds.length === 0) return new Map();
    const db = getDatabase();
    const placeholders = insightIds.map(() => '?').join(',');
    const rows = db.prepare(
      `SELECT * FROM brain_insight_annotations WHERE insight_id IN (${placeholders})`
    ).all(...insightIds) as DbInsightAnnotation[];
    const map = new Map<string, InsightAnnotation>();
    for (const row of rows) {
      map.set(row.insight_id, toAnnotation(row));
    }
    return map;
  },

  /**
   * Upsert an annotation for an insight (create or update)
   */
  upsert(insightId: string, note: string | null, tags: string[]): InsightAnnotation {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const tagsJson = JSON.stringify(tags);

    const existing = db.prepare(
      'SELECT id FROM brain_insight_annotations WHERE insight_id = ?'
    ).get(insightId) as { id: string } | undefined;

    if (existing) {
      db.prepare(`
        UPDATE brain_insight_annotations
        SET note = ?, tags = ?, updated_at = ?
        WHERE insight_id = ?
      `).run(note, tagsJson, now, insightId);
      return this.getByInsightId(insightId)!;
    }

    const id = generateId('ann');
    db.prepare(`
      INSERT INTO brain_insight_annotations (id, insight_id, note, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, insightId, note, tagsJson, now, now);

    return { id, insightId, note, tags, createdAt: now, updatedAt: now };
  },

  /**
   * Delete annotation for an insight
   */
  delete(insightId: string): boolean {
    const db = getDatabase();
    const result = db.prepare(
      'DELETE FROM brain_insight_annotations WHERE insight_id = ?'
    ).run(insightId);
    return result.changes > 0;
  },

  /**
   * Get all unique tags used across a project's insight annotations
   */
  getAllTagsForProject(projectId: string): string[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT DISTINCT a.tags
      FROM brain_insight_annotations a
      JOIN brain_insights i ON i.id = a.insight_id
      WHERE i.project_id = ?
    `).all(projectId) as Array<{ tags: string }>;

    const tagSet = new Set<string>();
    for (const row of rows) {
      for (const tag of parseTags(row.tags)) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  },

  /**
   * Get all unique tags across all projects (global scope)
   */
  getAllTags(): string[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT DISTINCT tags FROM brain_insight_annotations'
    ).all() as Array<{ tags: string }>;

    const tagSet = new Set<string>();
    for (const row of rows) {
      for (const tag of parseTags(row.tags)) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  },
};
