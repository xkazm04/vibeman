/**
 * Annette Semantic Indexer
 * Provides semantic similarity search using embeddings
 */

import { annetteDb } from '@/app/db';
import { getConnection } from '@/app/db/drivers';
import type { DbAnnetteMemory, DbAnnetteKnowledgeNode } from '@/app/db/models/annette.types';


interface EmbeddingResult {
  id: string;
  embedding: number[];
}

interface SimilarityResult<T> {
  item: T;
  similarity: number;
}

// Module-level cache for parsed embeddings to avoid repeated JSON.parse
// Key: row id, Value: { embedding, updatedAt }
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
    // Evict oldest entries if cache exceeds hard cap
    if (embeddingCache.size > CACHE_HARD_CAP) {
      const keysToDelete = Array.from(embeddingCache.keys()).slice(0, embeddingCache.size - CACHE_HARD_CAP);
      for (const key of keysToDelete) {
        embeddingCache.delete(key);
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Extract significant keywords from a query for SQL pre-filtering
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'like', 'through', 'after', 'over', 'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why']);
  return text.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 5); // Limit to 5 most significant keywords
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Simple hash-based embedding for text
 * This is a lightweight fallback when LLM embeddings are not available
 */
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

  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      embedding[i] /= norm;
    }
  }

  return embedding;
}

export const semanticIndexer = {
  /**
   * Generate embedding for text
   * Uses LLM for high-quality embeddings, falls back to simple hashing
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // For now, use simple embedding as a lightweight solution
    // In production, this could use OpenAI's embedding API or local models
    return simpleEmbedding(text);
  },

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  },

  /**
   * Index a memory by generating and storing its embedding
   */
  async indexMemory(memoryId: string): Promise<boolean> {
    const memory = annetteDb.memories.getById(memoryId);
    if (!memory) return false;

    const embedding = await this.generateEmbedding(memory.content);
    const db = getConnection();

    db.prepare(`
      UPDATE annette_memories
      SET embedding = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(embedding), memoryId);

    return true;
  },

  /**
   * Index a knowledge node by generating and storing its embedding
   */
  async indexKnowledgeNode(nodeId: string): Promise<boolean> {
    const node = annetteDb.knowledgeNodes.getById(nodeId);
    if (!node) return false;

    const textToEmbed = `${node.name} ${node.description || ''}`;
    const embedding = await this.generateEmbedding(textToEmbed);
    const db = getConnection();

    db.prepare(`
      UPDATE annette_knowledge_nodes
      SET embedding = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(embedding), nodeId);

    return true;
  },

  /**
   * Index all unindexed memories for a project
   */
  async indexAllMemories(projectId: string): Promise<number> {
    const db = getConnection();
    const unindexed = db.prepare(`
      SELECT id, content FROM annette_memories
      WHERE project_id = ? AND embedding IS NULL
      LIMIT 100
    `).all(projectId) as Array<{ id: string; content: string }>;

    let indexed = 0;
    for (const memory of unindexed) {
      const embedding = await this.generateEmbedding(memory.content);
      db.prepare(`
        UPDATE annette_memories
        SET embedding = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(JSON.stringify(embedding), memory.id);
      indexed++;
    }

    return indexed;
  },

  /**
   * Index all unindexed knowledge nodes for a project
   */
  async indexAllKnowledgeNodes(projectId: string): Promise<number> {
    const db = getConnection();
    const unindexed = db.prepare(`
      SELECT id, name, description FROM annette_knowledge_nodes
      WHERE project_id = ? AND embedding IS NULL
      LIMIT 100
    `).all(projectId) as Array<{ id: string; name: string; description: string | null }>;

    let indexed = 0;
    for (const node of unindexed) {
      const textToEmbed = `${node.name} ${node.description || ''}`;
      const embedding = await this.generateEmbedding(textToEmbed);
      db.prepare(`
        UPDATE annette_knowledge_nodes
        SET embedding = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(JSON.stringify(embedding), node.id);
      indexed++;
    }

    return indexed;
  },

  /**
   * Find similar memories using semantic search
   * Pre-filters by keyword overlap to reduce candidate set, then uses cached embeddings
   */
  async findSimilarMemories(
    projectId: string,
    query: string,
    limit = 10,
    minSimilarity = 0.3
  ): Promise<SimilarityResult<DbAnnetteMemory>[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const db = getConnection();

    // Pre-filter: try keyword-based narrowing first
    const keywords = extractKeywords(query);
    let memories: DbAnnetteMemory[];

    if (keywords.length > 0) {
      const likeClauses = keywords.map(() => 'content LIKE ?').join(' OR ');
      const likeParams = keywords.map(k => `%${k}%`);
      memories = db.prepare(`
        SELECT * FROM annette_memories
        WHERE project_id = ? AND embedding IS NOT NULL AND consolidated_into IS NULL
          AND (${likeClauses})
      `).all(projectId, ...likeParams) as unknown as DbAnnetteMemory[];

      // If pre-filter yields too few results, fall back to full scan
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

      const memoryEmbedding = getCachedEmbedding(memory.id, memory.embedding, memory.updated_at);
      if (!memoryEmbedding) continue;

      const similarity = cosineSimilarity(queryEmbedding, memoryEmbedding);
      if (similarity >= minSimilarity) {
        results.push({ item: memory, similarity });
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  },

  /**
   * Find similar knowledge nodes using semantic search
   * Pre-filters by keyword overlap to reduce candidate set, then uses cached embeddings
   */
  async findSimilarNodes(
    projectId: string,
    query: string,
    limit = 10,
    minSimilarity = 0.3
  ): Promise<SimilarityResult<DbAnnetteKnowledgeNode>[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const db = getConnection();

    // Pre-filter: try keyword-based narrowing first
    const keywords = extractKeywords(query);
    let nodes: DbAnnetteKnowledgeNode[];

    if (keywords.length > 0) {
      const likeClauses = keywords.map(() => '(name LIKE ? OR description LIKE ?)').join(' OR ');
      const likeParams = keywords.flatMap(k => [`%${k}%`, `%${k}%`]);
      nodes = db.prepare(`
        SELECT * FROM annette_knowledge_nodes
        WHERE project_id = ? AND embedding IS NOT NULL
          AND (${likeClauses})
      `).all(projectId, ...likeParams) as unknown as DbAnnetteKnowledgeNode[];

      // If pre-filter yields too few results, fall back to full scan
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

      const nodeEmbedding = getCachedEmbedding(node.id, node.embedding, node.updated_at);
      if (!nodeEmbedding) continue;

      const similarity = cosineSimilarity(queryEmbedding, nodeEmbedding);
      if (similarity >= minSimilarity) {
        results.push({ item: node, similarity });
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  },

  /**
   * Cluster similar memories together
   */
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
      if (assigned.has(memory.id)) continue;
      if (!memory.embedding) continue;

      const cluster: DbAnnetteMemory[] = [memory];
      assigned.add(memory.id);

      const embedding = JSON.parse(memory.embedding);

      for (const other of memories) {
        if (assigned.has(other.id)) continue;
        if (!other.embedding) continue;

        try {
          const otherEmbedding = JSON.parse(other.embedding);
          const similarity = cosineSimilarity(embedding, otherEmbedding);

          if (similarity >= similarityThreshold) {
            cluster.push(other);
            assigned.add(other.id);
          }
        } catch {
          // Skip if embedding parse fails
        }
      }

      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    }

    return clusters;
  },

};
