/**
 * Unified Knowledge Store
 *
 * Single orchestration layer that replaces three overlapping systems:
 * - knowledgeGraph (nodes + edges + LLM extraction)
 * - memoryStore (memories with decay + consolidation)
 * - semanticIndexer (dual embedding indexes + cosine search)
 *
 * All knowledge is stored as knowledge nodes. Memory-type entries are nodes
 * with source='memory' in properties. One embedding index serves all queries.
 * contextualRecaller queries this single system.
 */

import { annetteDb } from '@/app/db';
import { getConnection } from '@/app/db/drivers';
import type {
  DbAnnetteKnowledgeNode,
  DbAnnetteKnowledgeEdge,
  DbAnnetteMemory,
  KnowledgeNodeType,
  AnnetteMemoryType,
} from '@/app/db/models/annette.types';
import { generateWithLLM } from '@/lib/llm';

// ─── Re-exported types for backward compatibility ───

export type { KnowledgeNodeType, AnnetteMemoryType };

export interface KnowledgeNode {
  id: string;
  projectId: string;
  nodeType: KnowledgeNodeType;
  name: string;
  description: string | null;
  properties: Record<string, unknown> | null;
  mentionCount: number;
  importanceScore: number;
  lastMentionedAt: string;
  createdAt: string;
}

export interface KnowledgeEdge {
  id: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string;
  weight: number;
  properties: Record<string, unknown> | null;
  evidenceCount: number;
  lastObservedAt: string;
}

export interface Memory {
  id: string;
  projectId: string;
  sessionId: string | null;
  memoryType: AnnetteMemoryType;
  content: string;
  summary: string | null;
  importanceScore: number;
  decayFactor: number;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface ExtractedEntity {
  name: string;
  type: KnowledgeNodeType;
  description?: string;
  properties?: Record<string, unknown>;
}

export interface ExtractedRelationship {
  sourceEntity: string;
  targetEntity: string;
  relationshipType: string;
  weight?: number;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  error: boolean;
}

export interface MemoryCreateInput {
  projectId: string;
  sessionId?: string;
  memoryType: AnnetteMemoryType;
  content: string;
  summary?: string;
  embedding?: number[];
  importanceScore?: number;
  sourceMessageIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface MemorySearchOptions {
  projectId: string;
  query?: string;
  type?: AnnetteMemoryType;
  limit?: number;
  minImportance?: number;
  includeConsolidated?: boolean;
}

export interface SimilarityResult<T> {
  item: T;
  similarity: number;
}

// ─── Embedding helpers (from semanticIndexer) ───

const embeddingCache = new Map<string, { embedding: number[]; updatedAt: string }>();
const CACHE_HARD_CAP = 2000;

function getCachedEmbedding(id: string, embeddingJson: string, updatedAt: string): number[] | null {
  const cached = embeddingCache.get(id);
  if (cached && cached.updatedAt === updatedAt) {
    return cached.embedding;
  }
  try {
    const parsed = JSON.parse(embeddingJson) as number[];
    embeddingCache.set(id, { embedding: parsed, updatedAt });
    if (embeddingCache.size > CACHE_HARD_CAP) {
      const keysToDelete = Array.from(embeddingCache.keys()).slice(0, embeddingCache.size - CACHE_HARD_CAP);
      for (const key of keysToDelete) embeddingCache.delete(key);
    }
    return parsed;
  } catch {
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function simpleEmbedding(text: string, dimensions = 128): number[] {
  const embedding = new Array(dimensions).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const charCode = word.charCodeAt(j);
      const index = (charCode * (i + 1) * (j + 1)) % dimensions;
      embedding[index] += 1 / (1 + Math.log(i + 1));
    }
  }
  const norm = Math.sqrt(embedding.reduce((sum: number, val: number) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) embedding[i] /= norm;
  }
  return embedding;
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'like', 'through', 'after', 'over', 'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why']);
  return text.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 5);
}

// ─── LLM extraction helpers (from knowledgeGraph) ───

const VALID_NODE_TYPES = new Set<string>([
  'entity', 'concept', 'file', 'function', 'component',
  'api', 'decision', 'person', 'technology',
]);

function sanitizeForPrompt(text: string): string {
  const maxLen = 10000;
  return text.length > maxLen ? text.slice(0, maxLen) + '\n[...truncated]' : text;
}

function validateEntities(raw: unknown): ExtractedEntity[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((e): e is ExtractedEntity =>
    e != null && typeof e === 'object' &&
    typeof e.name === 'string' && e.name.length > 0 &&
    typeof e.type === 'string' && VALID_NODE_TYPES.has(e.type)
  ).map(e => ({
    name: e.name,
    type: e.type as KnowledgeNodeType,
    description: typeof e.description === 'string' ? e.description : undefined,
    properties: e.properties && typeof e.properties === 'object' && !Array.isArray(e.properties)
      ? e.properties as Record<string, unknown> : undefined,
  }));
}

function validateRelationships(raw: unknown): ExtractedRelationship[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is ExtractedRelationship =>
    r != null && typeof r === 'object' &&
    typeof r.sourceEntity === 'string' && r.sourceEntity.length > 0 &&
    typeof r.targetEntity === 'string' && r.targetEntity.length > 0 &&
    typeof r.relationshipType === 'string' && r.relationshipType.length > 0
  ).map(r => ({
    sourceEntity: r.sourceEntity,
    targetEntity: r.targetEntity,
    relationshipType: r.relationshipType,
    weight: typeof r.weight === 'number' && r.weight >= 0 && r.weight <= 1 ? r.weight : undefined,
  }));
}

// ─── DB row converters ───

function dbNodeToKnowledgeNode(db: DbAnnetteKnowledgeNode): KnowledgeNode {
  return {
    id: db.id,
    projectId: db.project_id,
    nodeType: db.node_type,
    name: db.name,
    description: db.description,
    properties: db.properties ? JSON.parse(db.properties) : null,
    mentionCount: db.mention_count,
    importanceScore: db.importance_score,
    lastMentionedAt: db.last_mentioned_at,
    createdAt: db.created_at,
  };
}

function dbEdgeToKnowledgeEdge(db: DbAnnetteKnowledgeEdge): KnowledgeEdge {
  return {
    id: db.id,
    projectId: db.project_id,
    sourceNodeId: db.source_node_id,
    targetNodeId: db.target_node_id,
    relationshipType: db.relationship_type,
    weight: db.weight,
    properties: db.properties ? JSON.parse(db.properties) : null,
    evidenceCount: db.evidence_count,
    lastObservedAt: db.last_observed_at,
  };
}

function dbToMemory(db: DbAnnetteMemory): Memory {
  return {
    id: db.id,
    projectId: db.project_id,
    sessionId: db.session_id,
    memoryType: db.memory_type,
    content: db.content,
    summary: db.summary,
    importanceScore: db.importance_score,
    decayFactor: db.decay_factor,
    accessCount: db.access_count,
    lastAccessedAt: db.last_accessed_at,
    createdAt: db.created_at,
    metadata: db.metadata ? JSON.parse(db.metadata) : null,
  };
}

// ─── Edge map builder ───

export function buildEdgeMap(
  nodeIds: Set<string>,
  getEdgesFn: (nodeId: string) => KnowledgeEdge[],
  mode: 'any' | 'both' = 'any',
): KnowledgeEdge[] {
  const edgeMap = new Map<string, KnowledgeEdge>();
  for (const nodeId of nodeIds) {
    const edges = getEdgesFn(nodeId);
    for (const edge of edges) {
      if (edgeMap.has(edge.id)) continue;
      const inSource = nodeIds.has(edge.sourceNodeId);
      const inTarget = nodeIds.has(edge.targetNodeId);
      if (mode === 'both' ? (inSource && inTarget) : (inSource || inTarget)) {
        edgeMap.set(edge.id, edge);
      }
    }
  }
  return Array.from(edgeMap.values());
}

// =========================================================================
// Unified Knowledge Store
// =========================================================================

export const unifiedKnowledgeStore = {

  // ─── Embedding ───

  async generateEmbedding(text: string): Promise<number[]> {
    return simpleEmbedding(text);
  },

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  },

  // ─── Unified semantic search (single index) ───

  /**
   * Search across ALL knowledge (memories + knowledge nodes) in one query.
   * Returns results sorted by similarity with a source tag.
   */
  async findSimilar(
    projectId: string,
    query: string,
    limit = 10,
    minSimilarity = 0.3
  ): Promise<Array<SimilarityResult<DbAnnetteMemory | DbAnnetteKnowledgeNode> & { source: 'memory' | 'knowledge' }>> {
    const queryEmbedding = await this.generateEmbedding(query);
    const db = getConnection();
    const keywords = extractKeywords(query);

    // Fetch memories with embeddings
    let memories: DbAnnetteMemory[];
    if (keywords.length > 0) {
      const likeClauses = keywords.map(() => 'content LIKE ?').join(' OR ');
      const likeParams = keywords.map(k => `%${k}%`);
      memories = db.prepare(`
        SELECT * FROM annette_memories
        WHERE project_id = ? AND embedding IS NOT NULL AND consolidated_into IS NULL
          AND (${likeClauses})
      `).all(projectId, ...likeParams) as unknown as DbAnnetteMemory[];
      if (memories.length < limit) {
        memories = db.prepare(`
          SELECT * FROM annette_memories
          WHERE project_id = ? AND embedding IS NOT NULL AND consolidated_into IS NULL
        `).all(projectId) as unknown as DbAnnetteMemory[];
      }
    } else {
      memories = db.prepare(`
        SELECT * FROM annette_memories
        WHERE project_id = ? AND embedding IS NOT NULL AND consolidated_into IS NULL
      `).all(projectId) as unknown as DbAnnetteMemory[];
    }

    // Fetch knowledge nodes with embeddings
    let nodes: DbAnnetteKnowledgeNode[];
    if (keywords.length > 0) {
      const likeClauses = keywords.map(() => '(name LIKE ? OR description LIKE ?)').join(' OR ');
      const likeParams = keywords.flatMap(k => [`%${k}%`, `%${k}%`]);
      nodes = db.prepare(`
        SELECT * FROM annette_knowledge_nodes
        WHERE project_id = ? AND embedding IS NOT NULL AND (${likeClauses})
      `).all(projectId, ...likeParams) as unknown as DbAnnetteKnowledgeNode[];
      if (nodes.length < limit) {
        nodes = db.prepare(`
          SELECT * FROM annette_knowledge_nodes
          WHERE project_id = ? AND embedding IS NOT NULL
        `).all(projectId) as unknown as DbAnnetteKnowledgeNode[];
      }
    } else {
      nodes = db.prepare(`
        SELECT * FROM annette_knowledge_nodes
        WHERE project_id = ? AND embedding IS NOT NULL
      `).all(projectId) as unknown as DbAnnetteKnowledgeNode[];
    }

    // Score all items against query embedding
    const results: Array<SimilarityResult<DbAnnetteMemory | DbAnnetteKnowledgeNode> & { source: 'memory' | 'knowledge' }> = [];

    for (const memory of memories) {
      if (!memory.embedding) continue;
      const emb = getCachedEmbedding(memory.id, memory.embedding, memory.updated_at);
      if (!emb) continue;
      const similarity = cosineSimilarity(queryEmbedding, emb);
      if (similarity >= minSimilarity) {
        results.push({ item: memory, similarity, source: 'memory' });
      }
    }

    for (const node of nodes) {
      if (!node.embedding) continue;
      const emb = getCachedEmbedding(node.id, node.embedding, node.updated_at);
      if (!emb) continue;
      const similarity = cosineSimilarity(queryEmbedding, emb);
      if (similarity >= minSimilarity) {
        results.push({ item: node, similarity, source: 'knowledge' });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  },

  /**
   * Find similar memories only (backward-compat wrapper).
   */
  async findSimilarMemories(
    projectId: string,
    query: string,
    limit = 10,
    minSimilarity = 0.3
  ): Promise<SimilarityResult<DbAnnetteMemory>[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const db = getConnection();
    const keywords = extractKeywords(query);
    let memories: DbAnnetteMemory[];

    if (keywords.length > 0) {
      const likeClauses = keywords.map(() => 'content LIKE ?').join(' OR ');
      const likeParams = keywords.map(k => `%${k}%`);
      memories = db.prepare(`
        SELECT * FROM annette_memories
        WHERE project_id = ? AND embedding IS NOT NULL AND consolidated_into IS NULL AND (${likeClauses})
      `).all(projectId, ...likeParams) as unknown as DbAnnetteMemory[];
      if (memories.length < limit) {
        memories = db.prepare(`
          SELECT * FROM annette_memories
          WHERE project_id = ? AND embedding IS NOT NULL AND consolidated_into IS NULL
        `).all(projectId) as unknown as DbAnnetteMemory[];
      }
    } else {
      memories = db.prepare(`
        SELECT * FROM annette_memories
        WHERE project_id = ? AND embedding IS NOT NULL AND consolidated_into IS NULL
      `).all(projectId) as unknown as DbAnnetteMemory[];
    }

    const results: SimilarityResult<DbAnnetteMemory>[] = [];
    for (const memory of memories) {
      if (!memory.embedding) continue;
      const emb = getCachedEmbedding(memory.id, memory.embedding, memory.updated_at);
      if (!emb) continue;
      const similarity = cosineSimilarity(queryEmbedding, emb);
      if (similarity >= minSimilarity) results.push({ item: memory, similarity });
    }
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  },

  /**
   * Find similar knowledge nodes only (backward-compat wrapper).
   */
  async findSimilarNodes(
    projectId: string,
    query: string,
    limit = 10,
    minSimilarity = 0.3
  ): Promise<SimilarityResult<DbAnnetteKnowledgeNode>[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const db = getConnection();
    const keywords = extractKeywords(query);
    let nodes: DbAnnetteKnowledgeNode[];

    if (keywords.length > 0) {
      const likeClauses = keywords.map(() => '(name LIKE ? OR description LIKE ?)').join(' OR ');
      const likeParams = keywords.flatMap(k => [`%${k}%`, `%${k}%`]);
      nodes = db.prepare(`
        SELECT * FROM annette_knowledge_nodes
        WHERE project_id = ? AND embedding IS NOT NULL AND (${likeClauses})
      `).all(projectId, ...likeParams) as unknown as DbAnnetteKnowledgeNode[];
      if (nodes.length < limit) {
        nodes = db.prepare(`
          SELECT * FROM annette_knowledge_nodes
          WHERE project_id = ? AND embedding IS NOT NULL
        `).all(projectId) as unknown as DbAnnetteKnowledgeNode[];
      }
    } else {
      nodes = db.prepare(`
        SELECT * FROM annette_knowledge_nodes
        WHERE project_id = ? AND embedding IS NOT NULL
      `).all(projectId) as unknown as DbAnnetteKnowledgeNode[];
    }

    const results: SimilarityResult<DbAnnetteKnowledgeNode>[] = [];
    for (const node of nodes) {
      if (!node.embedding) continue;
      const emb = getCachedEmbedding(node.id, node.embedding, node.updated_at);
      if (!emb) continue;
      const similarity = cosineSimilarity(queryEmbedding, emb);
      if (similarity >= minSimilarity) results.push({ item: node, similarity });
    }
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  },

  // ─── Indexing (single method for both types) ───

  async indexItem(id: string, table: 'memory' | 'knowledge'): Promise<boolean> {
    const db = getConnection();
    if (table === 'memory') {
      const memory = annetteDb.memories.getById(id);
      if (!memory) return false;
      const embedding = await this.generateEmbedding(memory.content);
      db.prepare(`UPDATE annette_memories SET embedding = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(JSON.stringify(embedding), id);
    } else {
      const node = annetteDb.knowledgeNodes.getById(id);
      if (!node) return false;
      const embedding = await this.generateEmbedding(`${node.name} ${node.description || ''}`);
      db.prepare(`UPDATE annette_knowledge_nodes SET embedding = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(JSON.stringify(embedding), id);
    }
    return true;
  },

  async indexAllUnindexed(projectId: string): Promise<{ memories: number; nodes: number }> {
    const db = getConnection();
    let memoriesIndexed = 0;
    let nodesIndexed = 0;

    const unindexedMemories = db.prepare(`
      SELECT id, content FROM annette_memories WHERE project_id = ? AND embedding IS NULL LIMIT 100
    `).all(projectId) as Array<{ id: string; content: string }>;

    for (const m of unindexedMemories) {
      const embedding = await this.generateEmbedding(m.content);
      db.prepare(`UPDATE annette_memories SET embedding = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(JSON.stringify(embedding), m.id);
      memoriesIndexed++;
    }

    const unindexedNodes = db.prepare(`
      SELECT id, name, description FROM annette_knowledge_nodes WHERE project_id = ? AND embedding IS NULL LIMIT 100
    `).all(projectId) as Array<{ id: string; name: string; description: string | null }>;

    for (const n of unindexedNodes) {
      const embedding = await this.generateEmbedding(`${n.name} ${n.description || ''}`);
      db.prepare(`UPDATE annette_knowledge_nodes SET embedding = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(JSON.stringify(embedding), n.id);
      nodesIndexed++;
    }

    return { memories: memoriesIndexed, nodes: nodesIndexed };
  },

  // ─── Clustering ───

  async clusterMemories(
    projectId: string,
    similarityThreshold = 0.7
  ): Promise<DbAnnetteMemory[][]> {
    const db = getConnection();
    const memories = db.prepare(`
      SELECT * FROM annette_memories
      WHERE project_id = ? AND embedding IS NOT NULL AND consolidated_into IS NULL
      ORDER BY created_at DESC
    `).all(projectId) as unknown as DbAnnetteMemory[];

    if (memories.length === 0) return [];

    const clusters: DbAnnetteMemory[][] = [];
    const assigned = new Set<string>();

    for (const memory of memories) {
      if (assigned.has(memory.id) || !memory.embedding) continue;
      const cluster: DbAnnetteMemory[] = [memory];
      assigned.add(memory.id);
      const embedding = JSON.parse(memory.embedding);

      for (const other of memories) {
        if (assigned.has(other.id) || !other.embedding) continue;
        try {
          const otherEmbedding = JSON.parse(other.embedding);
          if (cosineSimilarity(embedding, otherEmbedding) >= similarityThreshold) {
            cluster.push(other);
            assigned.add(other.id);
          }
        } catch { /* skip */ }
      }

      if (cluster.length > 1) clusters.push(cluster);
    }

    return clusters;
  },

  // ─── Knowledge Graph operations ───

  upsertNode(input: {
    projectId: string;
    nodeType: KnowledgeNodeType;
    name: string;
    description?: string;
    properties?: Record<string, unknown>;
  }): KnowledgeNode {
    const dbNode = annetteDb.knowledgeNodes.upsert(input);
    return dbNodeToKnowledgeNode(dbNode);
  },

  upsertEdge(input: {
    projectId: string;
    sourceNodeId: string;
    targetNodeId: string;
    relationshipType: string;
    weight?: number;
    properties?: Record<string, unknown>;
  }): KnowledgeEdge {
    const dbEdge = annetteDb.knowledgeEdges.upsert(input);
    return dbEdgeToKnowledgeEdge(dbEdge);
  },

  getNode(id: string): KnowledgeNode | null {
    const dbNode = annetteDb.knowledgeNodes.getById(id);
    return dbNode ? dbNodeToKnowledgeNode(dbNode) : null;
  },

  getNodeByName(projectId: string, name: string): KnowledgeNode | null {
    const dbNode = annetteDb.knowledgeNodes.getByName(projectId, name);
    return dbNode ? dbNodeToKnowledgeNode(dbNode) : null;
  },

  getNodes(projectId: string, options?: {
    limit?: number;
    type?: KnowledgeNodeType;
    minImportance?: number;
  }): KnowledgeNode[] {
    return annetteDb.knowledgeNodes.getByProject(projectId, options).map(dbNodeToKnowledgeNode);
  },

  searchNodes(projectId: string, query: string, limit = 20): KnowledgeNode[] {
    return annetteDb.knowledgeNodes.search(projectId, query, limit).map(dbNodeToKnowledgeNode);
  },

  getRelatedNodes(nodeId: string, limit = 20): KnowledgeNode[] {
    return annetteDb.knowledgeNodes.getRelated(nodeId, limit).map(dbNodeToKnowledgeNode);
  },

  getEdges(nodeId: string, direction: 'outgoing' | 'incoming' | 'both' = 'both'): KnowledgeEdge[] {
    return annetteDb.knowledgeEdges.getByNode(nodeId, direction).map(dbEdgeToKnowledgeEdge);
  },

  getAllEdges(projectId: string, options?: {
    limit?: number;
    relationshipType?: string;
    minWeight?: number;
  }): KnowledgeEdge[] {
    return annetteDb.knowledgeEdges.getByProject(projectId, options).map(dbEdgeToKnowledgeEdge);
  },

  deleteNode(id: string): boolean {
    return annetteDb.knowledgeNodes.delete(id);
  },

  deleteEdge(id: string): boolean {
    return annetteDb.knowledgeEdges.delete(id);
  },

  getGraph(projectId: string, options?: {
    nodeLimit?: number;
    edgeLimit?: number;
    minImportance?: number;
  }): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
    const nodes = this.getNodes(projectId, {
      limit: options?.nodeLimit ?? 100,
      minImportance: options?.minImportance,
    });
    const nodeIds = new Set(nodes.map(n => n.id));
    const allEdges = this.getAllEdges(projectId, { limit: options?.edgeLimit ?? 500 });
    const edges = allEdges.filter(e => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId));
    return { nodes, edges };
  },

  getGraphStats(projectId: string): {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<KnowledgeNodeType, number>;
    topEntities: Array<{ name: string; type: KnowledgeNodeType; importance: number }>;
  } {
    const nodes = this.getNodes(projectId, { limit: 1000 });
    const edges = this.getAllEdges(projectId, { limit: 5000 });
    const nodesByType: Record<KnowledgeNodeType, number> = {
      entity: 0, concept: 0, file: 0, function: 0, component: 0,
      api: 0, decision: 0, person: 0, technology: 0,
    };
    for (const node of nodes) nodesByType[node.nodeType]++;
    const topEntities = nodes
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, 10)
      .map(n => ({ name: n.name, type: n.nodeType, importance: n.importanceScore }));
    return { totalNodes: nodes.length, totalEdges: edges.length, nodesByType, topEntities };
  },

  // ─── LLM extraction ───

  async extractFromText(projectId: string, text: string): Promise<ExtractionResult> {
    const sanitizedText = sanitizeForPrompt(text);
    const prompt = `Analyze the user-provided text below (delimited by triple backticks) and extract entities and relationships for a knowledge graph.

\`\`\`
${sanitizedText}
\`\`\`

Entity types to look for:
- entity: Named entities (projects, products, services)
- concept: Abstract concepts or patterns
- file: File paths or file names
- function: Function or method names
- component: UI components or modules
- api: API endpoints or routes
- decision: Decisions or choices made
- person: People mentioned
- technology: Technologies, frameworks, libraries

For each entity, provide:
- name: The entity name
- type: One of the types above
- description: Brief description (optional)

For relationships, provide:
- sourceEntity: Name of source entity
- targetEntity: Name of target entity
- relationshipType: Type of relationship (e.g., "uses", "depends_on", "implements", "contains", "related_to")
- weight: Strength of relationship (0.1-1.0)

Respond in JSON format:
{
  "entities": [
    { "name": "UserAuth", "type": "component", "description": "Handles user authentication" }
  ],
  "relationships": [
    { "sourceEntity": "UserAuth", "targetEntity": "JWT", "relationshipType": "uses", "weight": 0.9 }
  ]
}

Only extract meaningful entities and relationships. If none found, return empty arrays.`;

    try {
      const response = await generateWithLLM(prompt, {
        provider: 'gemini',
        temperature: 0.2,
        maxTokens: 1500,
      });

      if (!response.success || !response.response) {
        return { entities: [], relationships: [], error: true };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(response.response);
      } catch {
        console.error('[unifiedKnowledgeStore] Failed to parse LLM response');
        return { entities: [], relationships: [], error: true };
      }

      if (parsed == null || typeof parsed !== 'object') {
        return { entities: [], relationships: [], error: true };
      }

      const obj = parsed as Record<string, unknown>;
      return {
        entities: validateEntities(obj.entities),
        relationships: validateRelationships(obj.relationships),
        error: false,
      };
    } catch (error) {
      console.error('[unifiedKnowledgeStore] Failed to extract entities:', error);
      return { entities: [], relationships: [], error: true };
    }
  },

  async buildFromText(
    projectId: string,
    text: string
  ): Promise<{ nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }> {
    const { entities, relationships } = await this.extractFromText(projectId, text);
    const nodes: KnowledgeNode[] = [];
    const nodeMap = new Map<string, KnowledgeNode>();

    for (const entity of entities) {
      const node = this.upsertNode({
        projectId,
        nodeType: entity.type,
        name: entity.name,
        description: entity.description,
        properties: entity.properties,
      });
      nodes.push(node);
      nodeMap.set(entity.name, node);
    }

    const edges: KnowledgeEdge[] = [];
    for (const rel of relationships) {
      const sourceNode = nodeMap.get(rel.sourceEntity) || this.getNodeByName(projectId, rel.sourceEntity);
      const targetNode = nodeMap.get(rel.targetEntity) || this.getNodeByName(projectId, rel.targetEntity);
      if (sourceNode && targetNode) {
        const edge = this.upsertEdge({
          projectId,
          sourceNodeId: sourceNode.id,
          targetNodeId: targetNode.id,
          relationshipType: rel.relationshipType,
          weight: rel.weight,
        });
        edges.push(edge);
      }
    }

    return { nodes, edges };
  },

  async queryGraph(
    projectId: string,
    question: string
  ): Promise<{ answer: string; relevantNodes: KnowledgeNode[]; relevantEdges: KnowledgeEdge[] }> {
    const relevantNodes = this.searchNodes(projectId, question, 10);
    if (relevantNodes.length === 0) {
      return { answer: 'No relevant information found in the knowledge graph.', relevantNodes: [], relevantEdges: [] };
    }

    const nodeIds = new Set(relevantNodes.map(n => n.id));
    const relevantEdges = buildEdgeMap(nodeIds, (id) => this.getEdges(id, 'both'), 'any');

    const nodesContext = relevantNodes.map(n => `- ${n.name} (${n.nodeType}): ${n.description || 'No description'}`).join('\n');
    const edgesContext = relevantEdges.map(e => {
      const source = relevantNodes.find(n => n.id === e.sourceNodeId);
      const target = relevantNodes.find(n => n.id === e.targetNodeId);
      return `- ${source?.name || '?'} --[${e.relationshipType}]--> ${target?.name || '?'}`;
    }).join('\n');

    const prompt = `Based on this knowledge graph context, answer the question.

Entities:
${nodesContext}

Relationships:
${edgesContext}

Question: ${question}

Provide a clear, concise answer based only on the information in the knowledge graph. If the information is insufficient, say so.`;

    try {
      const response = await generateWithLLM(prompt, { provider: 'gemini', temperature: 0.3, maxTokens: 500 });
      return {
        answer: response.success && response.response ? response.response : 'Unable to generate an answer.',
        relevantNodes,
        relevantEdges,
      };
    } catch {
      return { answer: 'Error querying the knowledge graph.', relevantNodes, relevantEdges };
    }
  },

  // ─── Memory operations ───

  createMemory(input: MemoryCreateInput): Memory {
    const dbMemory = annetteDb.memories.create(input);
    return dbToMemory(dbMemory);
  },

  getMemory(id: string): Memory | null {
    const dbMemory = annetteDb.memories.getById(id);
    if (!dbMemory) return null;
    annetteDb.memories.markAccessed(id);
    return dbToMemory(dbMemory);
  },

  getMemories(options: MemorySearchOptions): Memory[] {
    return annetteDb.memories.getByProject(options.projectId, {
      limit: options.limit,
      type: options.type,
      minImportance: options.minImportance,
      includeConsolidated: options.includeConsolidated,
    }).map(dbToMemory);
  },

  updateMemoryImportance(id: string, importance: number): void {
    annetteDb.memories.updateImportance(id, importance);
  },

  applyMemoryDecay(projectId: string, decayRate = 0.99): number {
    return annetteDb.memories.applyDecay(projectId, decayRate);
  },

  deleteMemory(id: string): boolean {
    return annetteDb.memories.delete(id);
  },

  pruneOldMemories(projectId: string, minDecayFactor = 0.01): number {
    return annetteDb.memories.pruneOld(projectId, minDecayFactor);
  },

  async extractMemoriesFromConversation(
    projectId: string,
    sessionId: string,
    messages: Array<{ role: string; content: string; id?: string }>
  ): Promise<Memory[]> {
    if (messages.length === 0) return [];

    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const prompt = `Analyze this conversation and extract key memories worth remembering for future conversations.

Conversation:
${conversationText}

Extract memories in the following categories:
- fact: Concrete facts about the project, codebase, or domain
- decision: Decisions made during the conversation
- preference: User preferences or patterns noticed
- insight: Important insights or realizations
- event: Notable events or milestones mentioned

For each memory, provide:
1. Type (one of the categories above)
2. Content (the memory itself, 1-3 sentences)
3. Importance (0.1-1.0, where 1.0 is critical information)

Respond in JSON format:
{
  "memories": [
    { "type": "fact", "content": "...", "importance": 0.8 },
    { "type": "decision", "content": "...", "importance": 0.9 }
  ]
}

Only extract truly important information worth remembering. If nothing important, return empty array.`;

    try {
      const response = await generateWithLLM(prompt, { provider: 'gemini', temperature: 0.3, maxTokens: 1000 });
      if (!response.success || !response.response) return [];

      const parsed = JSON.parse(response.response);
      const memories: Memory[] = [];
      const messageIds = messages.map(m => m.id).filter(Boolean) as string[];

      for (const mem of parsed.memories || []) {
        if (mem.type && mem.content) {
          const created = this.createMemory({
            projectId,
            sessionId,
            memoryType: mem.type as AnnetteMemoryType,
            content: mem.content,
            importanceScore: mem.importance || 0.5,
            sourceMessageIds: messageIds.length > 0 ? messageIds : undefined,
          });
          memories.push(created);
        }
      }

      return memories;
    } catch (error) {
      console.error('Failed to extract memories:', error);
      return [];
    }
  },

  async consolidateMemories(projectId: string, memoryIds: string[]): Promise<Memory | null> {
    if (memoryIds.length < 2) return null;

    const memories = memoryIds.map(id => this.getMemory(id)).filter((m): m is Memory => m !== null);
    if (memories.length < 2) return null;

    const memoryText = memories.map(m => `[${m.memoryType}] ${m.content}`).join('\n');
    const prompt = `Consolidate these related memories into a single, comprehensive summary:

Memories:
${memoryText}

Create a consolidated memory that:
1. Preserves all important information
2. Removes redundancy
3. Is clear and concise
4. Maintains context

Respond in JSON format:
{
  "summary": "...",
  "type": "insight",
  "importance": 0.8
}`;

    try {
      const response = await generateWithLLM(prompt, { provider: 'gemini', temperature: 0.3, maxTokens: 500 });
      if (!response.success || !response.response) return null;

      const parsed = JSON.parse(response.response);
      const consolidated = this.createMemory({
        projectId,
        memoryType: parsed.type || 'insight',
        content: parsed.summary,
        importanceScore: parsed.importance || 0.7,
        sourceMessageIds: memoryIds,
        metadata: { consolidatedFrom: memoryIds },
      });

      annetteDb.memories.markConsolidated(memoryIds, consolidated.id);

      const tokensBefore = memories.reduce((sum, m) => sum + m.content.length / 4, 0);
      const tokensAfter = parsed.summary.length / 4;
      annetteDb.consolidations.create({
        projectId,
        sourceMemoryIds: memoryIds,
        resultMemoryId: consolidated.id,
        consolidationType: 'summarize',
        tokensBefore: Math.round(tokensBefore),
        tokensAfter: Math.round(tokensAfter),
      });

      return consolidated;
    } catch (error) {
      console.error('Failed to consolidate memories:', error);
      return null;
    }
  },

  getConsolidationStats(projectId: string) {
    return annetteDb.consolidations.getTokenSavings(projectId);
  },
};
