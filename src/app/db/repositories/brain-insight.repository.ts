/**
 * Brain Insight Repository
 * First-class CRUD operations for brain insights (extracted from JSON blobs)
 */

import { getDatabase } from '../connection';
import { getHotWritesDatabase } from '../hot-writes';
import type { DbBrainInsight, LearningInsight, EvidenceRef } from '../models/brain.types';
import { getCurrentTimestamp, selectOne, selectAll } from './repository.utils';
import { createGenericRepository } from './generic.repository';
import { generateInsightHash } from '@/lib/brain/insightId';
import { InsightDeduplicator } from '@/lib/brain/InsightDeduplicator';

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

const base = createGenericRepository<DbBrainInsight>({
  tableName: 'brain_insights',
});

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
    const canonicalId = generateInsightHash(input.type, input.title, input.project_id);

    // Wrap in transaction for atomicity
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO brain_insights (
          id, reflection_id, project_id, type, title, description,
          confidence, evidence, canonical_id, evolves_from_id, evolves_title,
          conflict_with_id, conflict_with_title, conflict_type,
          conflict_resolved, conflict_resolution,
          auto_pruned, auto_prune_reason, original_confidence,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.id,
        input.reflection_id,
        input.project_id,
        input.type,
        input.title,
        input.description,
        input.confidence,
        JSON.stringify(input.evidence),
        canonicalId,
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

      // Insert evidence into junction table with FK validation
      if (input.evidence.length > 0) {
        const evidenceStmt = db.prepare(`
          INSERT INTO brain_insight_evidence (insight_id, evidence_type, evidence_id, created_at)
          VALUES (?, ?, ?, ?)
        `);

        // Prepare FK validation queries for each evidence type
        const directionExistsStmt = db.prepare('SELECT 1 FROM directions WHERE id = ? LIMIT 1');
        const reflectionExistsStmt = db.prepare('SELECT 1 FROM brain_reflections WHERE id = ? LIMIT 1');
        const hotDb = getHotWritesDatabase();
        const signalExistsStmt = hotDb.prepare('SELECT 1 FROM behavioral_signals WHERE id = ? LIMIT 1');

        const validEvidence: EvidenceRef[] = [];
        for (const ref of input.evidence) {
          let exists = false;
          if (ref.type === 'direction') {
            exists = !!directionExistsStmt.get(ref.id);
          } else if (ref.type === 'reflection') {
            exists = !!reflectionExistsStmt.get(ref.id);
          } else if (ref.type === 'signal') {
            exists = !!signalExistsStmt.get(ref.id);
          }

          if (!exists) {
            console.warn(
              `[brain-insight] Skipping missing evidence ${ref.type}:${ref.id} for insight "${input.title}" — reference may have been decayed`
            );
            continue;
          }

          validEvidence.push(ref);
          evidenceStmt.run(input.id, ref.type, ref.id, now);
        }

        // Update stored evidence JSON if any refs were skipped
        if (validEvidence.length !== input.evidence.length) {
          db.prepare('UPDATE brain_insights SET evidence = ? WHERE id = ?')
            .run(JSON.stringify(validEvidence), input.id);
        }
      }
    });

    // Execute transaction - will rollback on any error
    transaction();

    return selectOne<DbBrainInsight>(
      db,
      'SELECT * FROM brain_insights WHERE id = ?',
      input.id
    )!;
  },

  /**
   * Batch create insights (used during reflection completion)
   *
   * Resolves evolves_from_id and conflict_with_id via canonical_id lookup
   * instead of relying on fragile title matching. Also inserts lineage
   * records into insight_lineage for evolution and conflict tracking.
   */
  createBatch: (
    reflectionId: string,
    projectId: string,
    insights: LearningInsight[],
    deduplicator: InsightDeduplicator,
  ): DbBrainInsight[] => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const results: DbBrainInsight[] = [];

    // Wrap entire batch in transaction for atomicity
    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO brain_insights (
          id, reflection_id, project_id, type, title, description,
          confidence, evidence, canonical_id, evolves_from_id, evolves_title,
          conflict_with_id, conflict_with_title, conflict_type,
          conflict_resolved, conflict_resolution,
          auto_pruned, auto_prune_reason, original_confidence,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const evidenceStmt = db.prepare(`
        INSERT INTO brain_insight_evidence (insight_id, evidence_type, evidence_id, created_at)
        VALUES (?, ?, ?, ?)
      `);

      const lineageStmt = db.prepare(`
        INSERT INTO insight_lineage (parent_insight_id, child_insight_id, relationship_type, reason, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Prepare FK validation queries for each evidence type
      const directionExistsStmt = db.prepare('SELECT 1 FROM directions WHERE id = ? LIMIT 1');
      const reflectionExistsStmt = db.prepare('SELECT 1 FROM brain_reflections WHERE id = ? LIMIT 1');
      const hotDb = getHotWritesDatabase();
      const signalExistsStmt = hotDb.prepare('SELECT 1 FROM behavioral_signals WHERE id = ? LIMIT 1');

      for (const insight of insights) {
        const id = `bi_${crypto.randomUUID()}`;
        const canonicalId = generateInsightHash(insight.type, insight.title, projectId);

        // Resolve relationship IDs via deduplicator (single owner of canonical hash + title lookup)
        const evolvesFromId = insight.evolves
          ? deduplicator.resolveEvolvesFromId(insight.type, insight.evolves)
          : null;

        const conflictWithId = insight.conflict_with
          ? deduplicator.resolveConflictWithId(insight.conflict_with)
          : null;

        stmt.run(
          id,
          reflectionId,
          projectId,
          insight.type,
          insight.title,
          insight.description,
          insight.confidence,
          JSON.stringify(insight.evidence || []),
          canonicalId,
          evolvesFromId,
          insight.evolves || null,
          conflictWithId,
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

        // Insert lineage records for evolution and conflict relationships
        if (evolvesFromId) {
          lineageStmt.run(evolvesFromId, id, 'evolved_into', `Evolved: "${insight.evolves}" → "${insight.title}"`, now);
        }
        if (conflictWithId) {
          lineageStmt.run(conflictWithId, id, 'conflicts_with', `Conflict type: ${insight.conflict_type || 'unknown'}`, now);
        }

        // Insert evidence into junction table with FK validation (soft-skip invalid refs)
        const validEvidence: EvidenceRef[] = [];
        if (insight.evidence && insight.evidence.length > 0) {
          for (const ref of insight.evidence) {
            let exists = false;
            if (ref.type === 'direction') {
              exists = !!directionExistsStmt.get(ref.id);
            } else if (ref.type === 'reflection') {
              exists = !!reflectionExistsStmt.get(ref.id);
            } else if (ref.type === 'signal') {
              exists = !!signalExistsStmt.get(ref.id);
            }

            if (!exists) {
              console.warn(
                `[brain-insight] Skipping missing evidence ${ref.type}:${ref.id} for insight "${insight.title}" — reference may have been decayed`
              );
              continue;
            }

            validEvidence.push(ref);
            evidenceStmt.run(id, ref.type, ref.id, now);
          }

          // Update stored evidence JSON to match validated refs
          if (validEvidence.length !== insight.evidence.length) {
            db.prepare('UPDATE brain_insights SET evidence = ? WHERE id = ?')
              .run(JSON.stringify(validEvidence), id);
          }
        }

        const created = selectOne<DbBrainInsight>(db, 'SELECT * FROM brain_insights WHERE id = ?', id);
        if (created) results.push(created);
      }
    });

    // Execute transaction - will rollback on any error
    transaction();

    return results;
  },

  /**
   * Get insight by ID
   */
  getById: (id: string): DbBrainInsight | null => base.getById(id),

  /**
   * Get insight by canonical_id within a project (preferred for dedup lookups)
   */
  getByCanonicalId: (projectId: string, canonicalId: string): DbBrainInsight | null => {
    const db = getDatabase();
    return selectOne<DbBrainInsight>(
      db,
      'SELECT * FROM brain_insights WHERE project_id = ? AND canonical_id = ? ORDER BY created_at DESC LIMIT 1',
      projectId,
      canonicalId
    );
  },

  /**
   * Get insight by title within a project (legacy fallback)
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
   *
   * Builds confidence history by following the evolves_from_id chain (ID-based)
   * instead of the legacy title-alias approach. Falls back to evolves_title
   * for insights created before the ID-based lineage was introduced.
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
      // Get all insights in chronological order to build evolution chains
      const histQuery = isGlobal
        ? `SELECT bi.id, bi.title, bi.confidence, bi.reflection_id, bi.evolves_from_id, bi.evolves_title, br.completed_at
           FROM brain_insights bi
           JOIN brain_reflections br ON bi.reflection_id = br.id
           ORDER BY br.completed_at ASC`
        : `SELECT bi.id, bi.title, bi.confidence, bi.reflection_id, bi.evolves_from_id, bi.evolves_title, br.completed_at
           FROM brain_insights bi
           JOIN brain_reflections br ON bi.reflection_id = br.id
           WHERE bi.project_id = ?
           ORDER BY br.completed_at ASC`;

      const histRows = (isGlobal
        ? db.prepare(histQuery).all()
        : db.prepare(histQuery).all(projectId)
      ) as Array<{ id: string; title: string; confidence: number; reflection_id: string; evolves_from_id: string | null; evolves_title: string | null; completed_at: string }>;

      // Map insight id → its row for chain resolution
      const byId = new Map<string, typeof histRows[0]>();
      for (const hr of histRows) byId.set(hr.id, hr);

      // Track which insight id's history has been merged into a successor
      // Maps: old insight id → latest successor insight id
      const idRedirects = new Map<string, string>();

      for (const hr of histRows) {
        let targetId = hr.id;

        if (hr.evolves_from_id) {
          // Follow the redirect chain to find the canonical target
          let parentId = hr.evolves_from_id;
          while (idRedirects.has(parentId)) {
            parentId = idRedirects.get(parentId)!;
          }

          // Transfer parent's history to this insight
          const parentHistory = historyMap.get(parentId);
          if (parentHistory) {
            historyMap.set(hr.id, parentHistory);
            historyMap.delete(parentId);
          }
          // Redirect the parent (and any of its ancestors) to this insight
          idRedirects.set(parentId, hr.id);
          if (hr.evolves_from_id !== parentId) {
            idRedirects.set(hr.evolves_from_id, hr.id);
          }
          targetId = hr.id;
        } else if (hr.evolves_title && !hr.evolves_from_id) {
          // Legacy fallback: no evolves_from_id, use title matching
          for (const [existingId, existingHistory] of historyMap.entries()) {
            const existingRow = byId.get(existingId);
            if (existingRow && existingRow.title === hr.evolves_title) {
              historyMap.set(hr.id, existingHistory);
              historyMap.delete(existingId);
              idRedirects.set(existingId, hr.id);
              break;
            }
          }
          targetId = hr.id;
        }

        const history = historyMap.get(targetId) || [];
        history.push({
          confidence: hr.confidence,
          date: hr.completed_at,
          reflectionId: hr.reflection_id,
        });
        historyMap.set(targetId, history);
      }
    }

    return rows.map(row => ({
      ...dbInsightToLearning(row),
      project_id: row.project_id,
      reflection_id: row.reflection_id,
      confidenceHistory: includeHistory
        ? historyMap.get(row.id) || [{ confidence: row.confidence, date: row.completed_at, reflectionId: row.reflection_id }]
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
  delete: (id: string): boolean => base.deleteById(id),

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
      'SELECT COUNT(*) as count FROM brain_insights WHERE project_id = ? AND (conflict_with_id IS NOT NULL OR conflict_with_title IS NOT NULL) AND conflict_resolved = 0',
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

  /**
   * Get all insights that cite a specific piece of evidence.
   * Uses junction table for O(1) indexed lookup instead of full-table JSON parsing.
   *
   * @param evidenceType - 'direction' | 'signal' | 'reflection'
   * @param evidenceId - ID of the evidence entity
   * @returns Insights that cite this evidence
   */
  getByEvidence: (evidenceType: EvidenceRef['type'], evidenceId: string): DbBrainInsight[] => {
    const db = getDatabase();
    return selectAll<DbBrainInsight>(
      db,
      `SELECT bi.*
       FROM brain_insights bi
       JOIN brain_insight_evidence bie ON bie.insight_id = bi.id
       WHERE bie.evidence_type = ? AND bie.evidence_id = ?
       ORDER BY bi.created_at DESC`,
      evidenceType,
      evidenceId
    );
  },

  /**
   * Get evidence references for a specific insight from the junction table.
   * Returns typed EvidenceRef[] instead of parsing JSON.
   *
   * @param insightId - Insight ID
   * @returns Array of evidence references
   */
  getEvidenceForInsight: (insightId: string): EvidenceRef[] => {
    const db = getDatabase();
    const rows = selectAll<{ evidence_type: EvidenceRef['type']; evidence_id: string }>(
      db,
      `SELECT evidence_type, evidence_id
       FROM brain_insight_evidence
       WHERE insight_id = ?
       ORDER BY id ASC`,
      insightId
    );
    return rows.map(row => ({ type: row.evidence_type, id: row.evidence_id }));
  },

  /**
   * Count insights that cite a specific piece of evidence.
   * Useful for cache invalidation decisions.
   *
   * @param evidenceType - 'direction' | 'signal' | 'reflection'
   * @param evidenceId - ID of the evidence entity
   * @returns Count of insights citing this evidence
   */
  countByEvidence: (evidenceType: EvidenceRef['type'], evidenceId: string): number => {
    const db = getDatabase();
    const row = selectOne<{ count: number }>(
      db,
      `SELECT COUNT(DISTINCT insight_id) as count
       FROM brain_insight_evidence
       WHERE evidence_type = ? AND evidence_id = ?`,
      evidenceType,
      evidenceId
    );
    return row?.count ?? 0;
  },

};
