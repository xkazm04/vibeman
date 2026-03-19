/**
 * Knowledge Base Repository
 * CRUD operations for cross-project knowledge entries
 */

import { getDatabase } from '../connection';
import type {
  DbKnowledgeEntry,
  CreateKnowledgeEntryInput,
  KnowledgeQuery,
  KnowledgeDomain,
  KnowledgeLayer,
} from '../models/knowledge.types';
import { CATEGORY_TO_LAYER } from '../models/knowledge.types';
import { getCurrentTimestamp, selectOne, selectAll, generateId } from './repository.utils';
import { createHash } from 'crypto';

function computeCanonicalId(domain: string, title: string): string {
  const normalized = `${domain}:${title.toLowerCase().trim().replace(/\s+/g, ' ')}`;
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

function resolveLayer(input: CreateKnowledgeEntryInput): KnowledgeLayer {
  if (input.layer) return input.layer;
  return CATEGORY_TO_LAYER[input.domain] || 'cross_cutting';
}

export const knowledgeRepository = {
  create: (input: CreateKnowledgeEntryInput): DbKnowledgeEntry => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('ke');
    const canonicalId = computeCanonicalId(input.domain, input.title);

    // Check for duplicates
    const existing = selectOne<DbKnowledgeEntry>(
      db,
      'SELECT * FROM knowledge_entries WHERE canonical_id = ? AND status = ?',
      canonicalId, 'active'
    );
    if (existing) {
      return existing;
    }

    const appliesTo = JSON.stringify(input.applies_to || []);
    const filePatterns = input.file_patterns ? JSON.stringify(input.file_patterns) : null;
    const tags = JSON.stringify(input.tags || []);
    const language = input.language || 'universal';
    const layer = resolveLayer(input);

    db.prepare(`
      INSERT INTO knowledge_entries (
        id, domain, layer, pattern_type, title, pattern, rationale, code_example, anti_pattern,
        applies_to, file_patterns, tags, language, confidence,
        source_project_id, source_type, source_insight_id,
        times_applied, times_helpful, status, canonical_id,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'active', ?, ?, ?)
    `).run(
      id, input.domain, layer, input.pattern_type, input.title, input.pattern,
      input.rationale || null, input.code_example || null, input.anti_pattern || null,
      appliesTo, filePatterns, tags, language,
      input.confidence ?? 50,
      input.source_project_id || null,
      input.source_type || 'manual',
      input.source_insight_id || null,
      canonicalId, now, now
    );

    return {
      id, domain: input.domain, layer, pattern_type: input.pattern_type,
      title: input.title, pattern: input.pattern,
      rationale: input.rationale || null,
      code_example: input.code_example || null,
      anti_pattern: input.anti_pattern || null,
      applies_to: appliesTo, file_patterns: filePatterns, tags,
      language,
      confidence: input.confidence ?? 50,
      source_project_id: input.source_project_id || null,
      source_type: input.source_type || 'manual',
      source_insight_id: input.source_insight_id || null,
      times_applied: 0, times_helpful: 0, last_applied_at: null,
      status: 'active', canonical_id: canonicalId,
      created_at: now, updated_at: now,
    };
  },

  getById: (id: string): DbKnowledgeEntry | null => {
    const db = getDatabase();
    return selectOne<DbKnowledgeEntry>(db, 'SELECT * FROM knowledge_entries WHERE id = ?', id);
  },

  getByDomain: (domain: KnowledgeDomain, limit: number = 50): DbKnowledgeEntry[] => {
    const db = getDatabase();
    return selectAll<DbKnowledgeEntry>(
      db,
      `SELECT * FROM knowledge_entries WHERE domain = ? AND status = 'active' ORDER BY confidence DESC LIMIT ?`,
      domain, limit
    );
  },

  query: (q: KnowledgeQuery): DbKnowledgeEntry[] => {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: unknown[] = [];

    conditions.push('status = ?');
    params.push(q.status || 'active');

    if (q.domain) {
      conditions.push('domain = ?');
      params.push(q.domain);
    }

    if (q.layer) {
      conditions.push('layer = ?');
      params.push(q.layer);
    }

    if (q.tags?.length) {
      const tagConditions = q.tags.map(() => 'tags LIKE ?');
      conditions.push(`(${tagConditions.join(' OR ')})`);
      params.push(...q.tags.map(t => `%"${t}"%`));
    }

    if (q.applies_to?.length) {
      const techConditions = q.applies_to.map(() => 'applies_to LIKE ?');
      conditions.push(`(${techConditions.join(' OR ')})`);
      params.push(...q.applies_to.map(t => `%"${t}"%`));
    }

    if (q.language) {
      conditions.push("(language = ? OR language = 'universal')");
      params.push(q.language);
    }

    if (q.search) {
      conditions.push('(title LIKE ? OR pattern LIKE ? OR rationale LIKE ?)');
      const term = `%${q.search}%`;
      params.push(term, term, term);
    }

    if (q.min_confidence) {
      conditions.push('confidence >= ?');
      params.push(q.min_confidence);
    }

    if (q.project_id) {
      conditions.push('(source_project_id IS NULL OR source_project_id = ?)');
      params.push(q.project_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = q.limit || 50;
    params.push(limit);

    return selectAll<DbKnowledgeEntry>(
      db,
      `SELECT * FROM knowledge_entries ${whereClause} ORDER BY confidence DESC, times_helpful DESC LIMIT ?`,
      ...params
    );
  },

  getForFilePaths: (filePaths: string[], options?: { layer?: KnowledgeLayer; limit?: number }): DbKnowledgeEntry[] => {
    const db = getDatabase();
    if (filePaths.length === 0) return [];

    const limit = options?.limit ?? 10;
    const fpConditions = filePaths.map(() => 'file_patterns LIKE ?');
    const params: unknown[] = filePaths.map(fp => `%${fp.split('/').slice(0, 3).join('/')}%`);

    let layerClause = '';
    if (options?.layer) {
      layerClause = ' AND layer = ?';
      params.push(options.layer);
    }
    params.push(limit);

    return selectAll<DbKnowledgeEntry>(
      db,
      `SELECT * FROM knowledge_entries WHERE status = 'active' AND file_patterns IS NOT NULL AND (${fpConditions.join(' OR ')})${layerClause} ORDER BY confidence DESC LIMIT ?`,
      ...params
    );
  },

  recordApplication: (id: string, helpful: boolean): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const helpfulIncrement = helpful ? 1 : 0;
    db.prepare(`
      UPDATE knowledge_entries
      SET times_applied = times_applied + 1,
          times_helpful = times_helpful + ?,
          last_applied_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(helpfulIncrement, now, now, id);
  },

  getActiveForExport: (): DbKnowledgeEntry[] => {
    const db = getDatabase();
    return selectAll<DbKnowledgeEntry>(
      db,
      `SELECT * FROM knowledge_entries WHERE status = 'active' ORDER BY domain, confidence DESC`
    );
  },

  deprecate: (id: string, reason: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    db.prepare(`
      UPDATE knowledge_entries SET status = 'deprecated', updated_at = ? WHERE id = ?
    `).run(now, id);
  },

  delete: (id: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM knowledge_entries WHERE id = ?').run(id);
    return result.changes > 0;
  },

  search: (searchTerm: string, limit: number = 20): DbKnowledgeEntry[] => {
    const db = getDatabase();
    const term = `%${searchTerm}%`;
    return selectAll<DbKnowledgeEntry>(
      db,
      `SELECT * FROM knowledge_entries
       WHERE status = 'active' AND (title LIKE ? OR pattern LIKE ? OR rationale LIKE ? OR tags LIKE ?)
       ORDER BY confidence DESC
       LIMIT ?`,
      term, term, term, term, limit
    );
  },

  getStats: (): { total: number; byDomain: Record<string, number>; avgConfidence: number } => {
    const db = getDatabase();
    const totals = selectOne<{ total: number; avg_conf: number }>(
      db,
      `SELECT COUNT(*) as total, COALESCE(AVG(confidence), 0) as avg_conf FROM knowledge_entries WHERE status = 'active'`
    );
    const domainRows = selectAll<{ domain: string; count: number }>(
      db,
      `SELECT domain, COUNT(*) as count FROM knowledge_entries WHERE status = 'active' GROUP BY domain`
    );
    const byDomain: Record<string, number> = {};
    for (const row of domainRows) {
      byDomain[row.domain] = row.count;
    }
    return {
      total: totals?.total ?? 0,
      byDomain,
      avgConfidence: totals?.avg_conf ?? 0,
    };
  },

  getByLayer: (layer: KnowledgeLayer, limit: number = 50): DbKnowledgeEntry[] => {
    const db = getDatabase();
    return selectAll<DbKnowledgeEntry>(
      db,
      `SELECT * FROM knowledge_entries WHERE layer = ? AND status = 'active' ORDER BY confidence DESC LIMIT ?`,
      layer, limit
    );
  },

  /** Returns tree structure: { language → { layer → { category → count } } } */
  getTreeStructure: (): Record<string, Record<string, Record<string, number>>> => {
    const db = getDatabase();
    const rows = selectAll<{ language: string; layer: string; domain: string; count: number }>(
      db,
      `SELECT language, layer, domain, COUNT(*) as count
       FROM knowledge_entries WHERE status = 'active'
       GROUP BY language, layer, domain
       ORDER BY language, layer, domain`
    );
    const tree: Record<string, Record<string, Record<string, number>>> = {};
    for (const row of rows) {
      if (!tree[row.language]) tree[row.language] = {};
      if (!tree[row.language][row.layer]) tree[row.language][row.layer] = {};
      tree[row.language][row.layer][row.domain] = row.count;
    }
    return tree;
  },
};
