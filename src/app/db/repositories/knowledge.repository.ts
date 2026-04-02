/**
 * Knowledge Base Repository
 * CRUD operations for cross-project knowledge entries
 */

import { getDatabase } from '../connection';
import type {
  DbKnowledgeEntry,
  DbKbEntryLink,
  HubLinkedEntry,
  CreateKnowledgeEntryInput,
  KnowledgeQuery,
  KnowledgeDomain,
  KnowledgeLayer,
} from '../models/knowledge.types';
import { CATEGORY_TO_LAYER } from '../models/knowledge.types';
import { getCurrentTimestamp, selectOne, selectAll, generateId, escapeLikePattern } from './repository.utils';
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
      const tagConditions = q.tags.map(() => "tags LIKE ? ESCAPE '\\'");
      conditions.push(`(${tagConditions.join(' OR ')})`);
      params.push(...q.tags.map(t => `%"${escapeLikePattern(t)}"%`));
    }

    if (q.applies_to?.length) {
      const techConditions = q.applies_to.map(() => "applies_to LIKE ? ESCAPE '\\'");
      conditions.push(`(${techConditions.join(' OR ')})`);
      params.push(...q.applies_to.map(t => `%"${escapeLikePattern(t)}"%`));
    }

    if (q.language) {
      conditions.push("(language = ? OR language = 'universal')");
      params.push(q.language);
    }

    if (q.search) {
      conditions.push("(title LIKE ? ESCAPE '\\' OR pattern LIKE ? ESCAPE '\\' OR rationale LIKE ? ESCAPE '\\')");
      const term = `%${escapeLikePattern(q.search)}%`;
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
    const fpConditions = filePaths.map(() => "file_patterns LIKE ? ESCAPE '\\'");
    const params: unknown[] = filePaths.map(fp => `%${escapeLikePattern(fp.split('/').slice(0, 3).join('/'))}%`);

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

  deprecate: (id: string, _reason?: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    db.prepare(`
      UPDATE knowledge_entries SET status = 'deprecated', updated_at = ? WHERE id = ?
    `).run(now, id);
  },

  delete: (id: string): boolean => {
    const db = getDatabase();
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM kb_entry_links WHERE hub_entry_id = ? OR linked_entry_id = ?').run(id, id);
      return db.prepare('DELETE FROM knowledge_entries WHERE id = ?').run(id);
    });
    const result = transaction();
    return result.changes > 0;
  },

  search: (searchTerm: string, limit: number = 20): DbKnowledgeEntry[] => {
    const db = getDatabase();
    const term = `%${escapeLikePattern(searchTerm)}%`;
    return selectAll<DbKnowledgeEntry>(
      db,
      `SELECT * FROM knowledge_entries
       WHERE status = 'active' AND (title LIKE ? ESCAPE '\\' OR pattern LIKE ? ESCAPE '\\' OR rationale LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')
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

  /** Get all hub entries (pattern_type = 'hub'), optionally filtered by category */
  getHubEntries: (domain?: KnowledgeDomain): DbKnowledgeEntry[] => {
    const db = getDatabase();
    if (domain) {
      return selectAll<DbKnowledgeEntry>(
        db,
        `SELECT * FROM knowledge_entries WHERE pattern_type = 'hub' AND status = 'active' AND domain = ? ORDER BY title`,
        domain
      );
    }
    return selectAll<DbKnowledgeEntry>(
      db,
      `SELECT * FROM knowledge_entries WHERE pattern_type = 'hub' AND status = 'active' ORDER BY title`
    );
  },

  // ── Hub Link Methods ─────────────────────────────────────────────────

  /** Add a link from a hub entry to a target entry */
  addHubLink: (hubEntryId: string, linkedEntryId: string, note?: string): DbKbEntryLink => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('kbl');

    // Wrap SELECT MAX + INSERT in a transaction to prevent duplicate sort_order
    const transaction = db.transaction(() => {
      const maxRow = selectOne<{ max_order: number | null }>(
        db,
        'SELECT MAX(sort_order) as max_order FROM kb_entry_links WHERE hub_entry_id = ?',
        hubEntryId
      );
      const sortOrder = (maxRow?.max_order ?? -1) + 1;

      db.prepare(`
        INSERT INTO kb_entry_links (id, hub_entry_id, linked_entry_id, sort_order, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, hubEntryId, linkedEntryId, sortOrder, note || null, now);

      return sortOrder;
    });
    const sortOrder = transaction();

    return { id, hub_entry_id: hubEntryId, linked_entry_id: linkedEntryId, sort_order: sortOrder, note: note || null, created_at: now };
  },

  /** Remove a link from a hub */
  removeHubLink: (linkId: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM kb_entry_links WHERE id = ?').run(linkId);
    return result.changes > 0;
  },

  /** Get all linked entries for a hub, with full entry data, ordered by sort_order */
  getHubLinks: (hubEntryId: string): HubLinkedEntry[] => {
    const db = getDatabase();
    const rows = selectAll<DbKbEntryLink & DbKnowledgeEntry & { link_id: string; link_note: string | null; link_sort_order: number; link_created_at: string }>(
      db,
      `SELECT
        l.id as link_id,
        l.hub_entry_id,
        l.linked_entry_id,
        l.sort_order as link_sort_order,
        l.note as link_note,
        l.created_at as link_created_at,
        e.*
       FROM kb_entry_links l
       JOIN knowledge_entries e ON e.id = l.linked_entry_id
       WHERE l.hub_entry_id = ? AND e.status = 'active'
       ORDER BY l.sort_order`,
      hubEntryId
    );

    return rows.map(row => ({
      id: row.link_id,
      hub_entry_id: row.hub_entry_id,
      linked_entry_id: row.linked_entry_id,
      sort_order: row.link_sort_order,
      note: row.link_note,
      created_at: row.link_created_at,
      entry: {
        id: row.linked_entry_id,
        domain: row.domain,
        layer: row.layer,
        pattern_type: row.pattern_type,
        title: row.title,
        pattern: row.pattern,
        rationale: row.rationale,
        code_example: row.code_example,
        anti_pattern: row.anti_pattern,
        applies_to: row.applies_to,
        file_patterns: row.file_patterns,
        tags: row.tags,
        language: row.language,
        confidence: row.confidence,
        source_project_id: row.source_project_id,
        source_type: row.source_type,
        source_insight_id: row.source_insight_id,
        times_applied: row.times_applied,
        times_helpful: row.times_helpful,
        last_applied_at: row.last_applied_at,
        status: row.status,
        canonical_id: row.canonical_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    }));
  },

  /** Reorder links within a hub — accepts an array of link IDs in desired order */
  reorderHubLinks: (hubEntryId: string, linkIds: string[]): void => {
    const db = getDatabase();
    const stmt = db.prepare(
      'UPDATE kb_entry_links SET sort_order = ? WHERE id = ? AND hub_entry_id = ?'
    );
    const transaction = db.transaction(() => {
      linkIds.forEach((linkId, index) => {
        stmt.run(index, linkId, hubEntryId);
      });
    });
    transaction();
  },
};
