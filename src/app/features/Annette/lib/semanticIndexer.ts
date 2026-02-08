/**
 * Annette Semantic Indexer
 * Provides semantic similarity search using embeddings
 */

import { annetteDb } from '@/app/db';
import type { DbAnnetteMemory, DbAnnetteKnowledgeNode } from '@/app/db/models/annette.types';
import { generateWithLLM } from '@/lib/llm';

interface EmbeddingResult {
  id: string;
  embedding: number[];
}

interface SimilarityResult<T> {
  item: T;
  similarity: number;
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
    const db = (await import('@/app/db/drivers')).getConnection();

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
    const db = (await import('@/app/db/drivers')).getConnection();

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
    const db = (await import('@/app/db/drivers')).getConnection();
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
    const db = (await import('@/app/db/drivers')).getConnection();
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
   */
  async findSimilarMemories(
    projectId: string,
    query: string,
    limit = 10,
    minSimilarity = 0.3
  ): Promise<SimilarityResult<DbAnnetteMemory>[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const db = (await import('@/app/db/drivers')).getConnection();

    const memories = db.prepare(`
      SELECT * FROM annette_memories
      WHERE project_id = ? AND embedding IS NOT NULL AND consolidated_into IS NULL
    `).all(projectId) as unknown as DbAnnetteMemory[];

    const results: SimilarityResult<DbAnnetteMemory>[] = [];

    for (const memory of memories) {
      if (!memory.embedding) continue;

      try {
        const memoryEmbedding = JSON.parse(memory.embedding);
        const similarity = cosineSimilarity(queryEmbedding, memoryEmbedding);

        if (similarity >= minSimilarity) {
          results.push({ item: memory, similarity });
        }
      } catch {
        // Skip if embedding parse fails
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  },

  /**
   * Find similar knowledge nodes using semantic search
   */
  async findSimilarNodes(
    projectId: string,
    query: string,
    limit = 10,
    minSimilarity = 0.3
  ): Promise<SimilarityResult<DbAnnetteKnowledgeNode>[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const db = (await import('@/app/db/drivers')).getConnection();

    const nodes = db.prepare(`
      SELECT * FROM annette_knowledge_nodes
      WHERE project_id = ? AND embedding IS NOT NULL
    `).all(projectId) as unknown as DbAnnetteKnowledgeNode[];

    const results: SimilarityResult<DbAnnetteKnowledgeNode>[] = [];

    for (const node of nodes) {
      if (!node.embedding) continue;

      try {
        const nodeEmbedding = JSON.parse(node.embedding);
        const similarity = cosineSimilarity(queryEmbedding, nodeEmbedding);

        if (similarity >= minSimilarity) {
          results.push({ item: node, similarity });
        }
      } catch {
        // Skip if embedding parse fails
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  },

  /**
   * Find memories and nodes similar to a given memory
   */
  async findRelated(
    memoryId: string,
    limit = 10
  ): Promise<{
    memories: SimilarityResult<DbAnnetteMemory>[];
    nodes: SimilarityResult<DbAnnetteKnowledgeNode>[];
  }> {
    const memory = annetteDb.memories.getById(memoryId);
    if (!memory) {
      return { memories: [], nodes: [] };
    }

    const [memories, nodes] = await Promise.all([
      this.findSimilarMemories(memory.project_id, memory.content, limit),
      this.findSimilarNodes(memory.project_id, memory.content, limit),
    ]);

    // Filter out the source memory
    const filteredMemories = memories.filter(m => m.item.id !== memoryId);

    return {
      memories: filteredMemories,
      nodes,
    };
  },

  /**
   * Cluster similar memories together
   */
  async clusterMemories(
    projectId: string,
    similarityThreshold = 0.7
  ): Promise<DbAnnetteMemory[][]> {
    const db = (await import('@/app/db/drivers')).getConnection();
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

  /**
   * Get embedding statistics for a project
   */
  async getStats(projectId: string): Promise<{
    totalMemories: number;
    indexedMemories: number;
    totalNodes: number;
    indexedNodes: number;
    indexingProgress: number;
  }> {
    const db = (await import('@/app/db/drivers')).getConnection();

    const memoryStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as indexed
      FROM annette_memories
      WHERE project_id = ? AND consolidated_into IS NULL
    `).get(projectId) as { total: number; indexed: number };

    const nodeStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as indexed
      FROM annette_knowledge_nodes
      WHERE project_id = ?
    `).get(projectId) as { total: number; indexed: number };

    const totalItems = memoryStats.total + nodeStats.total;
    const indexedItems = memoryStats.indexed + nodeStats.indexed;

    return {
      totalMemories: memoryStats.total,
      indexedMemories: memoryStats.indexed,
      totalNodes: nodeStats.total,
      indexedNodes: nodeStats.indexed,
      indexingProgress: totalItems > 0 ? indexedItems / totalItems : 1,
    };
  },
};
