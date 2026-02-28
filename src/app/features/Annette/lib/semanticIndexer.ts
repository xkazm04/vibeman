/**
 * Annette Semantic Indexer
 *
 * Thin facade over UnifiedKnowledgeStore for backward compatibility.
 * All logic has been consolidated into unifiedKnowledgeStore.ts.
 */

import { unifiedKnowledgeStore } from './unifiedKnowledgeStore';

export const semanticIndexer = {
  generateEmbedding: unifiedKnowledgeStore.generateEmbedding.bind(unifiedKnowledgeStore),
  generateEmbeddings: unifiedKnowledgeStore.generateEmbeddings.bind(unifiedKnowledgeStore),

  async indexMemory(memoryId: string): Promise<boolean> {
    return unifiedKnowledgeStore.indexItem(memoryId, 'memory');
  },

  async indexKnowledgeNode(nodeId: string): Promise<boolean> {
    return unifiedKnowledgeStore.indexItem(nodeId, 'knowledge');
  },

  async indexAllMemories(projectId: string): Promise<number> {
    const result = await unifiedKnowledgeStore.indexAllUnindexed(projectId);
    return result.memories;
  },

  async indexAllKnowledgeNodes(projectId: string): Promise<number> {
    const result = await unifiedKnowledgeStore.indexAllUnindexed(projectId);
    return result.nodes;
  },

  findSimilarMemories: unifiedKnowledgeStore.findSimilarMemories.bind(unifiedKnowledgeStore),
  findSimilarNodes: unifiedKnowledgeStore.findSimilarNodes.bind(unifiedKnowledgeStore),
  clusterMemories: unifiedKnowledgeStore.clusterMemories.bind(unifiedKnowledgeStore),
};
