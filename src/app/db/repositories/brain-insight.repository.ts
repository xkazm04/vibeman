/**
 * Brain Insight Repository
 * First-class CRUD operations for brain insights (extracted from JSON blobs)
 */

import { getDatabase } from '../connection';
import type { DbBrainInsight, LearningInsight, EvidenceRef } from '../models/brain.types';
import { getCurrentTimestamp, selectOne, selectAll } from './repository.utils';

/**
 * Parse evidence JSON, handling both legacy string[] and typed EvidenceRef[] formats.
 * Legacy strings are classified by prefix: sig_ → signal, ref_/br_ → reflection, else direction.
 */
function parseEvidence(raw: string): EvidenceRef[] {
  let parsed: unknown[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => {
    if (typeof item === 'object' && item !== null && 'type' in item && 'id' in item) {
      return item as EvidenceRef;
    }
    // Legacy plain string → classify by prefix
    const id = String(item);
    if (id.startsWith('sig_')) return { type: 'signal' as const, id };
    if (id.startsWith('ref_') || id.startsWith('br_')) return { type: 'reflection' as const, id };
    return { type: 'direction' as const, id };
  });
}

/**
 * Convert a DbBrainInsight row to a LearningInsight (for backward compatibility)
 */
export function dbInsightToLearning(row: DbBrainInsight): LearningInsight {
  const evidence = parseEvidence(row.evidence);

  return {
    type: row.type,
    title: row.title,
    description: row.description,
    confidence: row.confidence,
    evidence,
    evolves: row.evolves_title || undefined,
    conflict_with: row.conflict_with_title || undefined,
    conflict_type: row.conflict_type as LearningInsight['conflict_type'],
    conflict_resolved: row.conflict_resolved === 1,
    conflict_resolution: row.conflict_resolution as LearningInsight['conflict_resolution'],
    auto_pruned: row.auto_pruned === 1,
    auto_prune_reason: row.auto_prune_reason || undefined,
    original_confidence: row.original_confidence ?? undefined,
  };
}

export const brainInsightRepository = {
  /**
   * Create a new insight
   */
  create: (input: {
    id: string;
    reflection_id: string;
    project_id: string;
    type: LearningInsight['type'];
    title: string;
    description: string;
    confidence: number;
    evidence: EvidenceRef[];
    evolves_from_id?: string | null;
    evolves_title?: string | null;
    conflict_with_id?: string | null;
    conflict_with_title?: string | null;
    conflict_type?: string | null;
    conflict_resolved?: boolean;
    conflict_resolution?: string | null;
    auto_pruned?: boolean;
    auto_prune_reason?: string | null;
    original_confidence?: number | null;
  }): DbBrainInsight => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    db.prepare(`
      INSERT INTO brain_insights (
        id, reflection_id, project_id, type, title, description,
        confidence, evidence, evolves_from_id, evolves_title,
        conflict_with_id, conflict_with_title, conflict_type,
        conflict_resolved, conflict_resolution,
        auto_pruned, auto_prune_reason, original_confidence,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.id,
      input.reflection_id,
      input.project_id,
      input.type,
      input.title,
      input.description,
      input.confidence,
      JSON.stringify(input.evidence),
      input.evolves_from_id ?? null,
      input.evolves_title ?? null,
      input.conflict_with_id ?? null,
      input.conflict_with_title ?? null,
      input.conflict_type ?? null,
      input.conflict_resolved ? 1 : 0,
      input.conflict_resolution ?? null,
      input.auto_pruned ? 1 : 0,
      input.auto_prune_reason ?? null,
      input.original_confidence ?? null,
      now,
      now
    );

    return selectOne<DbBrainInsight>(
      db,
      'SELECT * FROM brain_insights WHERE id = ?',
      input.id
    )!;
  },

  /**
   * Batch create insights (used during reflection completion)
   */
  createBatch: (
    reflectionId: string,
    projectId: string,
    insights: LearningInsight[]
  ): DbBrainInsight[] => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const results: DbBrainInsight[] = [];

    const stmt = db.prepare(`
      INSERT INTO brain_insights (
        id, reflection_id, project_id, type, title, description,
        confidence, evidence, evolves_from_id, evolves_title,
        conflict_with_id, conflict_with_title, conflict_type,
        conflict_resolved, conflict_resolution,
        auto_pruned, auto_prune_reason, original_confidence,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const insight of insights) {
      const id = `bi_${crypto.randomUUID()}`;

      stmt.run(
        id,
        reflectionId,
        projectId,
        insight.type,
        insight.title,
        insight.description,
        insight.confidence,
        JSON.stringify(insight.evidence || []),
        null, // evolves_from_id resolved later
        insight.evolves || null,
        null, // conflict_with_id resolved later
        insight.conflict_with || null,
        insight.conflict_type || null,
        insight.conflict_resolved ? 1 : 0,
        insight.conflict_resolution || null,
        insight.auto_pruned ? 1 : 0,
        insight.auto_prune_reason || null,
        insight.original_confidence ?? null,
        now,
        now
      );

      const created = selectOne<DbBrainInsight>(db, 'SELECT * FROM brain_insights WHERE id = ?', id);
      if (created) results.push(created);
    }

    return results;
  },

  /**
   * Get insight by ID
   */
  getById: (id: string): DbBrainInsight | null => {
    const db = getDatabase();
    return selectOne<DbBrainInsight>(db, 'SELECT * FROM brain_insights WHERE id = ?', id);
  },

  /**
   * Get insight by title within a project
   */
  getByTitle: (projectId: string, title: string): DbBrainInsight | null => {
    const db = getDatabase();
    return selectOne<DbBrainInsight>(
      db,
      'SELECT * FROM brain_insights WHERE project_id = ? AND title = ? ORDER BY created_at DESC LIMIT 1',
      projectId,
      title
    );
  },

  /**
   * Get all insights for a reflection
   */
  getByReflection: (reflectionId: string): DbBrainInsight[] => {
    const db = getDatabase();
    return selectAll<DbBrainInsight>(
      db,
      'SELECT * FROM brain_insights WHERE reflection_id = ? ORDER BY created_at ASC',
      reflectionId
    );
  },

  /**
   * Get all insights for multiple reflections in a single query.
   * Returns a Map keyed by reflection_id for O(1) lookup.
   */
  getByReflectionIds: (reflectionIds: string[]): Map<string, DbBrainInsight[]> => {
    const result = new Map<string, DbBrainInsight[]>();
    if (reflectionIds.length === 0) return result;

    const db = getDatabase();
    const placeholders = reflectionIds.map(() => '?').join(',');
    const rows = selectAll<DbBrainInsight>(
      db,
      `SELECT * FROM brain_insights WHERE reflection_id IN (${placeholders}) ORDER BY created_at ASC`,
      ...reflectionIds
    );

    for (const row of rows) {
      const list = result.get(row.reflection_id);
      if (list) {
        list.push(row);
      } else {
        result.set(row.reflection_id, [row]);
      }
    }

    return result;
  },

  /**
   * Get all insights for a project (most recent first)
   */
  getByProject: (projectId: string, limit: number = 100): DbBrainInsight[] => {
    const db = getDatabase();
    return selectAll<DbBrainInsight>(
      db,
      'SELECT * FROM brain_insights WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
      projectId,
      limit
    );
  },

  /**
   * Get all insights as LearningInsight[] for a project (backward compat)
   */
  getAllInsights: (projectId: string, limit: number = 100): LearningInsight[] => {
    const db = getDatabase();
    const rows = selectAll<DbBrainInsight>(
      db,
      'SELECT * FROM brain_insights WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
      projectId,
      limit
    );
    return rows.map(dbInsightToLearning);
  },

  /**
   * Get all insights globally as LearningInsight[] with project_id
   */
  getAllInsightsGlobal: (limit: number = 100): Array<LearningInsight & { project_id: string }> => {
    const db = getDatabase();
    const rows = selectAll<DbBrainInsight>(
      db,
      'SELECT * FROM brain_insights ORDER BY created_at DESC LIMIT ?',
      limit
    );
    return rows.map(row => ({
      ...dbInsightToLearning(row),
      project_id: row.project_id,
    }));
  },

  /**
   * Get insights with metadata for the UI (includes confidence history)
   */
  getWithMeta: (
    projectId: string | null,
    isGlobal: boolean,
    includeHistory: boolean = true
  ): Array<LearningInsight & { project_id: string; reflection_id: string; confidenceHistory?: Array<{ confidence: number; date: string; reflectionId: string }> }> => {
    const db = getDatabase();

    const query = isGlobal
      ? `SELECT bi.*, br.completed_at
         FROM brain_insights bi
         JOIN brain_reflections br ON bi.reflection_id = br.id
         ORDER BY bi.created_at DESC LIMIT 200`
      : `SELECT bi.*, br.completed_at
         FROM brain_insights bi
         JOIN brain_reflections br ON bi.reflection_id = br.id
         WHERE bi.project_id = ?
         ORDER BY bi.created_at DESC LIMIT 100`;

    const rows = (isGlobal
      ? db.prepare(query).all()
      : db.prepare(query).all(projectId)
    ) as Array<DbBrainInsight & { completed_at: string }>;

    // Build confidence history if requested
    const historyMap = new Map<string, Array<{ confidence: number; date: string; reflectionId: string }>>();

    if (includeHistory) {
      // Get all insights in chronological order to build history
      const histQuery = isGlobal
        ? `SELECT bi.title, bi.confidence, bi.reflection_id, bi.evolves_title, br.completed_at
           FROM brain_insights bi
           JOIN brain_reflections br ON bi.reflection_id = br.id
           ORDER BY br.completed_at ASC`
        : `SELECT bi.title, bi.confidence, bi.reflection_id, bi.evolves_title, br.completed_at
           FROM brain_insights bi
           JOIN brain_reflections br ON bi.reflection_id = br.id
           WHERE bi.project_id = ?
           ORDER BY br.completed_at ASC`;

      const histRows = (isGlobal
        ? db.prepare(histQuery).all()
        : db.prepare(histQuery).all(projectId)
      ) as Array<{ title: string; confidence: number; reflection_id: string; evolves_title: string | null; completed_at: string }>;

      // Track title aliases (evolves chain)
      const titleAliases = new Map<string, string>();

      for (const hr of histRows) {
        let canonicalTitle = hr.title;

        if (hr.evolves_title) {
          // This insight evolved from another — update alias chain
          const resolvedAlias = titleAliases.get(hr.evolves_title);
          if (resolvedAlias) {
            // Transfer history
            const oldHistory = historyMap.get(resolvedAlias);
            if (oldHistory) {
              historyMap.set(hr.title, oldHistory);
              historyMap.delete(resolvedAlias);
            }
          } else {
            const oldHistory = historyMap.get(hr.evolves_title);
            if (oldHistory) {
              historyMap.set(hr.title, oldHistory);
              historyMap.delete(hr.evolves_title);
            }
          }
          titleAliases.set(hr.evolves_title, hr.title);
          canonicalTitle = hr.title;
        }

        const history = historyMap.get(canonicalTitle) || [];
        history.push({
          confidence: hr.confidence,
          date: hr.completed_at,
          reflectionId: hr.reflection_id,
        });
        historyMap.set(canonicalTitle, history);
      }
    }

    return rows.map(row => ({
      ...dbInsightToLearning(row),
      project_id: row.project_id,
      reflection_id: row.reflection_id,
      confidenceHistory: includeHistory
        ? historyMap.get(row.title) || [{ confidence: row.confidence, date: row.completed_at, reflectionId: row.reflection_id }]
        : undefined,
    }));
  },

  /**
   * Update an insight's fields
   */
  update: (id: string, updates: Partial<Pick<DbBrainInsight, 'confidence' | 'conflict_with_id' | 'conflict_with_title' | 'conflict_type' | 'conflict_resolved' | 'conflict_resolution' | 'auto_pruned' | 'auto_prune_reason' | 'original_confidence'>>): DbBrainInsight | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const fields: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (updates.confidence !== undefined) { fields.push('confidence = ?'); values.push(updates.confidence); }
    if (updates.conflict_with_id !== undefined) { fields.push('conflict_with_id = ?'); values.push(updates.conflict_with_id); }
    if (updates.conflict_with_title !== undefined) { fields.push('conflict_with_title = ?'); values.push(updates.conflict_with_title); }
    if (updates.conflict_type !== undefined) { fields.push('conflict_type = ?'); values.push(updates.conflict_type); }
    if (updates.conflict_resolved !== undefined) { fields.push('conflict_resolved = ?'); values.push(updates.conflict_resolved); }
    if (updates.conflict_resolution !== undefined) { fields.push('conflict_resolution = ?'); values.push(updates.conflict_resolution); }
    if (updates.auto_pruned !== undefined) { fields.push('auto_pruned = ?'); values.push(updates.auto_pruned); }
    if (updates.auto_prune_reason !== undefined) { fields.push('auto_prune_reason = ?'); values.push(updates.auto_prune_reason); }
    if (updates.original_confidence !== undefined) { fields.push('original_confidence = ?'); values.push(updates.original_confidence); }

    values.push(id);
    db.prepare(`UPDATE brain_insights SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return selectOne<DbBrainInsight>(db, 'SELECT * FROM brain_insights WHERE id = ?', id);
  },

  /**
   * Delete an insight by ID
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM brain_insights WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * Delete an insight by title within a reflection
   */
  deleteByTitle: (reflectionId: string, title: string): boolean => {
    const db = getDatabase();
    const result = db.prepare(
      'DELETE FROM brain_insights WHERE reflection_id = ? AND title = ?'
    ).run(reflectionId, title);
    return result.changes > 0;
  },

  /**
   * Count insights for a reflection
   */
  countByReflection: (reflectionId: string): number => {
    const db = getDatabase();
    const row = selectOne<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM brain_insights WHERE reflection_id = ?',
      reflectionId
    );
    return row?.count ?? 0;
  },

  /**
   * Count total insights for a project
   */
  countByProject: (projectId: string): number => {
    const db = getDatabase();
    const row = selectOne<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM brain_insights WHERE project_id = ?',
      projectId
    );
    return row?.count ?? 0;
  },

  /**
   * Count unresolved conflicts for a project
   */
  countUnresolvedConflicts: (projectId: string): number => {
    const db = getDatabase();
    const row = selectOne<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM brain_insights WHERE project_id = ? AND conflict_with_title IS NOT NULL AND conflict_resolved = 0',
      projectId
    );
    return row?.count ?? 0;
  },

  /**
   * Get insights with effectiveness data (joins with directions for scoring)
   */
  getForEffectiveness: (projectId: string): Array<DbBrainInsight & { completed_at: string }> => {
    const db = getDatabase();
    return selectAll<DbBrainInsight & { completed_at: string }>(
      db,
      `SELECT bi.*, br.completed_at
       FROM brain_insights bi
       JOIN brain_reflections br ON bi.reflection_id = br.id
       WHERE bi.project_id = ? AND br.status = 'completed'
       ORDER BY br.completed_at ASC`,
      projectId
    );
  },

  /**
   * Delete all insights for a reflection
   */
  deleteByReflection: (reflectionId: string): number => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM brain_insights WHERE reflection_id = ?').run(reflectionId);
    return result.changes;
  },

};
