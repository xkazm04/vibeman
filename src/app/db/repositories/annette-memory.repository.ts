/**
 * Annette Memory System Repository
 * Handles persistent memory storage, knowledge graph, and memory consolidation
 */

import { getConnection } from '../drivers';
import { v4 as uuidv4 } from 'uuid';
import type {
  DbAnnetteMemory,
  DbAnnetteKnowledgeNode,
  DbAnnetteKnowledgeEdge,
  DbAnnetteMemoryConsolidation,
  AnnetteMemoryType,
  KnowledgeNodeType,
  ConsolidationType,
} from '../models/annette.types';

// ─── Memory Operations ───

export const annetteMemoryRepository = {
  create(input: {
    projectId: string;
    sessionId?: string;
    memoryType: AnnetteMemoryType;
    content: string;
    summary?: string;
    embedding?: number[];
    importanceScore?: number;
    sourceMessageIds?: string[];
    metadata?: Record<string, unknown>;
  }): DbAnnetteMemory {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO annette_memories (
        id, project_id, session_id, memory_type, content, summary, embedding,
        importance_score, decay_factor, access_count, source_message_ids, metadata,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1.0, 0, ?, ?, ?, ?)
    `).run(
      id,
      input.projectId,
      input.sessionId || null,
      input.memoryType,
      input.content,
      input.summary || null,
      input.embedding ? JSON.stringify(input.embedding) : null,
      input.importanceScore ?? 0.5,
      input.sourceMessageIds ? JSON.stringify(input.sourceMessageIds) : null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      now,
      now
    );

    return this.getById(id)!;
  },

  getById(id: string): DbAnnetteMemory | null {
    const db = getConnection();
    return db.prepare('SELECT * FROM annette_memories WHERE id = ?').get(id) as unknown as DbAnnetteMemory | null;
  },

  getByProject(projectId: string, options?: {
    limit?: number;
    type?: AnnetteMemoryType;
    minImportance?: number;
    includeConsolidated?: boolean;
  }): DbAnnetteMemory[] {
    const db = getConnection();
    const limit = options?.limit ?? 50;
    const conditions: string[] = ['project_id = ?'];
    const params: (string | number | boolean | null)[] = [projectId];

    if (options?.type) {
      conditions.push('memory_type = ?');
      params.push(options.type);
    }

    if (options?.minImportance !== undefined) {
      conditions.push('importance_score >= ?');
      params.push(options.minImportance);
    }

    if (!options?.includeConsolidated) {
      conditions.push('consolidated_into IS NULL');
    }

    params.push(limit);

    return db.prepare(`
      SELECT * FROM annette_memories
      WHERE ${conditions.join(' AND ')}
      ORDER BY importance_score * decay_factor DESC, created_at DESC
      LIMIT ?
    `).all(...params) as unknown as DbAnnetteMemory[];
  },

  getBySession(sessionId: string, limit = 100): DbAnnetteMemory[] {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM annette_memories
      WHERE session_id = ?
      ORDER BY created_at ASC
      LIMIT ?
    `).all(sessionId, limit) as unknown as DbAnnetteMemory[];
  },

  getRecentActive(projectId: string, limit = 20): DbAnnetteMemory[] {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM annette_memories
      WHERE project_id = ? AND consolidated_into IS NULL
      ORDER BY
        CASE WHEN last_accessed_at IS NOT NULL THEN last_accessed_at ELSE created_at END DESC
      LIMIT ?
    `).all(projectId, limit) as unknown as DbAnnetteMemory[];
  },

  updateImportance(id: string, importanceScore: number): void {
    const db = getConnection();
    db.prepare(`
      UPDATE annette_memories
      SET importance_score = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(importanceScore, id);
  },

  markAccessed(id: string): void {
    const db = getConnection();
    db.prepare(`
      UPDATE annette_memories
      SET access_count = access_count + 1,
          last_accessed_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(id);
  },

  applyDecay(projectId: string, decayRate = 0.99): number {
    const db = getConnection();
    const result = db.prepare(`
      UPDATE annette_memories
      SET decay_factor = decay_factor * ?,
          updated_at = datetime('now')
      WHERE project_id = ? AND decay_factor > 0.01 AND consolidated_into IS NULL
    `).run(decayRate, projectId);
    return result.changes;
  },

  markConsolidated(memoryIds: string[], resultMemoryId: string): void {
    const db = getConnection();
    const stmt = db.prepare(`
      UPDATE annette_memories
      SET consolidated_into = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    for (const id of memoryIds) {
      stmt.run(resultMemoryId, id);
    }
  },

  getStaleMemories(projectId: string, maxDecayFactor = 0.1, limit = 100): DbAnnetteMemory[] {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM annette_memories
      WHERE project_id = ? AND decay_factor < ? AND consolidated_into IS NULL
      ORDER BY decay_factor ASC
      LIMIT ?
    `).all(projectId, maxDecayFactor, limit) as unknown as DbAnnetteMemory[];
  },

  delete(id: string): boolean {
    const db = getConnection();
    return db.prepare('DELETE FROM annette_memories WHERE id = ?').run(id).changes > 0;
  },

  pruneOld(projectId: string, minDecayFactor = 0.01): number {
    const db = getConnection();
    const result = db.prepare(`
      DELETE FROM annette_memories
      WHERE project_id = ? AND decay_factor < ? AND consolidated_into IS NULL
    `).run(projectId, minDecayFactor);
    return result.changes;
  },
};

// ─── Knowledge Graph Node Operations ───

export const annetteKnowledgeNodeRepository = {
  upsert(input: {
    projectId: string;
    nodeType: KnowledgeNodeType;
    name: string;
    description?: string;
    properties?: Record<string, unknown>;
    embedding?: number[];
  }): DbAnnetteKnowledgeNode {
    const db = getConnection();
    const now = new Date().toISOString();

    const existing = db.prepare(`
      SELECT * FROM annette_knowledge_nodes
      WHERE project_id = ? AND node_type = ? AND name = ?
    `).get(input.projectId, input.nodeType, input.name) as unknown as DbAnnetteKnowledgeNode | null;

    if (existing) {
      db.prepare(`
        UPDATE annette_knowledge_nodes
        SET description = COALESCE(?, description),
            properties = COALESCE(?, properties),
            embedding = COALESCE(?, embedding),
            mention_count = mention_count + 1,
            importance_score = MIN(importance_score + 0.1, 2.0),
            last_mentioned_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        input.description || null,
        input.properties ? JSON.stringify(input.properties) : null,
        input.embedding ? JSON.stringify(input.embedding) : null,
        now,
        now,
        existing.id
      );
      return this.getById(existing.id)!;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO annette_knowledge_nodes (
        id, project_id, node_type, name, description, properties, embedding,
        mention_count, importance_score, last_mentioned_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0.5, ?, ?, ?)
    `).run(
      id,
      input.projectId,
      input.nodeType,
      input.name,
      input.description || null,
      input.properties ? JSON.stringify(input.properties) : null,
      input.embedding ? JSON.stringify(input.embedding) : null,
      now,
      now,
      now
    );

    return this.getById(id)!;
  },

  getById(id: string): DbAnnetteKnowledgeNode | null {
    const db = getConnection();
    return db.prepare('SELECT * FROM annette_knowledge_nodes WHERE id = ?').get(id) as unknown as DbAnnetteKnowledgeNode | null;
  },

  getByName(projectId: string, name: string): DbAnnetteKnowledgeNode | null {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM annette_knowledge_nodes
      WHERE project_id = ? AND name = ?
    `).get(projectId, name) as unknown as DbAnnetteKnowledgeNode | null;
  },

  getByProject(projectId: string, options?: {
    limit?: number;
    type?: KnowledgeNodeType;
    minImportance?: number;
  }): DbAnnetteKnowledgeNode[] {
    const db = getConnection();
    const limit = options?.limit ?? 100;
    const conditions: string[] = ['project_id = ?'];
    const params: (string | number | boolean | null)[] = [projectId];

    if (options?.type) {
      conditions.push('node_type = ?');
      params.push(options.type);
    }

    if (options?.minImportance !== undefined) {
      conditions.push('importance_score >= ?');
      params.push(options.minImportance);
    }

    params.push(limit);

    return db.prepare(`
      SELECT * FROM annette_knowledge_nodes
      WHERE ${conditions.join(' AND ')}
      ORDER BY importance_score DESC, mention_count DESC
      LIMIT ?
    `).all(...params) as unknown as DbAnnetteKnowledgeNode[];
  },

  search(projectId: string, query: string, limit = 20): DbAnnetteKnowledgeNode[] {
    const db = getConnection();
    const searchPattern = `%${query}%`;
    return db.prepare(`
      SELECT * FROM annette_knowledge_nodes
      WHERE project_id = ? AND (name LIKE ? OR description LIKE ?)
      ORDER BY importance_score DESC
      LIMIT ?
    `).all(projectId, searchPattern, searchPattern, limit) as unknown as DbAnnetteKnowledgeNode[];
  },

  getRelated(nodeId: string, limit = 20): DbAnnetteKnowledgeNode[] {
    const db = getConnection();
    return db.prepare(`
      SELECT DISTINCT n.*
      FROM annette_knowledge_nodes n
      JOIN annette_knowledge_edges e ON (e.source_node_id = ? AND e.target_node_id = n.id)
                                     OR (e.target_node_id = ? AND e.source_node_id = n.id)
      ORDER BY e.weight DESC
      LIMIT ?
    `).all(nodeId, nodeId, limit) as unknown as DbAnnetteKnowledgeNode[];
  },

  delete(id: string): boolean {
    const db = getConnection();
    return db.prepare('DELETE FROM annette_knowledge_nodes WHERE id = ?').run(id).changes > 0;
  },
};

// ─── Knowledge Graph Edge Operations ───

export const annetteKnowledgeEdgeRepository = {
  upsert(input: {
    projectId: string;
    sourceNodeId: string;
    targetNodeId: string;
    relationshipType: string;
    weight?: number;
    properties?: Record<string, unknown>;
  }): DbAnnetteKnowledgeEdge {
    const db = getConnection();
    const now = new Date().toISOString();

    const existing = db.prepare(`
      SELECT * FROM annette_knowledge_edges
      WHERE project_id = ? AND source_node_id = ? AND target_node_id = ? AND relationship_type = ?
    `).get(input.projectId, input.sourceNodeId, input.targetNodeId, input.relationshipType) as unknown as DbAnnetteKnowledgeEdge | null;

    if (existing) {
      db.prepare(`
        UPDATE annette_knowledge_edges
        SET weight = COALESCE(?, weight),
            properties = COALESCE(?, properties),
            evidence_count = evidence_count + 1,
            last_observed_at = ?
        WHERE id = ?
      `).run(
        input.weight ?? null,
        input.properties ? JSON.stringify(input.properties) : null,
        now,
        existing.id
      );
      return this.getById(existing.id)!;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO annette_knowledge_edges (
        id, project_id, source_node_id, target_node_id, relationship_type,
        weight, properties, evidence_count, last_observed_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      input.projectId,
      input.sourceNodeId,
      input.targetNodeId,
      input.relationshipType,
      input.weight ?? 1.0,
      input.properties ? JSON.stringify(input.properties) : null,
      now,
      now
    );

    return this.getById(id)!;
  },

  getById(id: string): DbAnnetteKnowledgeEdge | null {
    const db = getConnection();
    return db.prepare('SELECT * FROM annette_knowledge_edges WHERE id = ?').get(id) as unknown as DbAnnetteKnowledgeEdge | null;
  },

  getByNode(nodeId: string, direction: 'outgoing' | 'incoming' | 'both' = 'both'): DbAnnetteKnowledgeEdge[] {
    const db = getConnection();

    if (direction === 'outgoing') {
      return db.prepare(`
        SELECT * FROM annette_knowledge_edges
        WHERE source_node_id = ?
        ORDER BY weight DESC
      `).all(nodeId) as unknown as DbAnnetteKnowledgeEdge[];
    }

    if (direction === 'incoming') {
      return db.prepare(`
        SELECT * FROM annette_knowledge_edges
        WHERE target_node_id = ?
        ORDER BY weight DESC
      `).all(nodeId) as unknown as DbAnnetteKnowledgeEdge[];
    }

    return db.prepare(`
      SELECT * FROM annette_knowledge_edges
      WHERE source_node_id = ? OR target_node_id = ?
      ORDER BY weight DESC
    `).all(nodeId, nodeId) as unknown as DbAnnetteKnowledgeEdge[];
  },

  getByProject(projectId: string, options?: {
    limit?: number;
    relationshipType?: string;
    minWeight?: number;
  }): DbAnnetteKnowledgeEdge[] {
    const db = getConnection();
    const limit = options?.limit ?? 500;
    const conditions: string[] = ['project_id = ?'];
    const params: (string | number | boolean | null)[] = [projectId];

    if (options?.relationshipType) {
      conditions.push('relationship_type = ?');
      params.push(options.relationshipType);
    }

    if (options?.minWeight !== undefined) {
      conditions.push('weight >= ?');
      params.push(options.minWeight);
    }

    params.push(limit);

    return db.prepare(`
      SELECT * FROM annette_knowledge_edges
      WHERE ${conditions.join(' AND ')}
      ORDER BY weight DESC
      LIMIT ?
    `).all(...params) as unknown as DbAnnetteKnowledgeEdge[];
  },

  delete(id: string): boolean {
    const db = getConnection();
    return db.prepare('DELETE FROM annette_knowledge_edges WHERE id = ?').run(id).changes > 0;
  },
};

// ─── Memory Consolidation Operations ───

export const annetteMemoryConsolidationRepository = {
  create(input: {
    projectId: string;
    sourceMemoryIds: string[];
    resultMemoryId: string;
    consolidationType: ConsolidationType;
    tokensBefore?: number;
    tokensAfter?: number;
  }): DbAnnetteMemoryConsolidation {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO annette_memory_consolidations (
        id, project_id, source_memory_ids, result_memory_id, consolidation_type,
        tokens_before, tokens_after, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.projectId,
      JSON.stringify(input.sourceMemoryIds),
      input.resultMemoryId,
      input.consolidationType,
      input.tokensBefore ?? null,
      input.tokensAfter ?? null,
      now
    );

    return this.getById(id)!;
  },

  getById(id: string): DbAnnetteMemoryConsolidation | null {
    const db = getConnection();
    return db.prepare('SELECT * FROM annette_memory_consolidations WHERE id = ?').get(id) as unknown as DbAnnetteMemoryConsolidation | null;
  },

  getByProject(projectId: string, limit = 50): DbAnnetteMemoryConsolidation[] {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM annette_memory_consolidations
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(projectId, limit) as unknown as DbAnnetteMemoryConsolidation[];
  },

  getTokenSavings(projectId: string): { totalBefore: number; totalAfter: number; savings: number } {
    const db = getConnection();
    const result = db.prepare(`
      SELECT
        COALESCE(SUM(tokens_before), 0) as totalBefore,
        COALESCE(SUM(tokens_after), 0) as totalAfter
      FROM annette_memory_consolidations
      WHERE project_id = ?
    `).get(projectId) as { totalBefore: number; totalAfter: number };

    return {
      totalBefore: result.totalBefore,
      totalAfter: result.totalAfter,
      savings: result.totalBefore - result.totalAfter,
    };
  },
};
