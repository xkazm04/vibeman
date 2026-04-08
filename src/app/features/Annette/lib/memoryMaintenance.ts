/**
 * Memory Maintenance
 *
 * Handles memory decay, pruning, consolidation, and learning from conversations.
 * Delegates to the unified knowledge store for actual operations.
 */

import { unifiedKnowledgeStore } from './unifiedKnowledgeStore';

/**
 * Learn from conversation by extracting memories and building knowledge graph
 */
export async function learnFromConversation(
  projectId: string,
  sessionId: string,
  messages: Array<{ role: string; content: string; id?: string }>
): Promise<{
  memoriesCreated: number;
  nodesCreated: number;
  edgesCreated: number;
}> {
  // Extract memories
  const memories = await unifiedKnowledgeStore.extractMemoriesFromConversation(projectId, sessionId, messages);

  // Build conversation text for entity extraction
  const conversationText = messages.map(m => m.content).join('\n');

  // Extract and build knowledge graph
  const { nodes, edges } = await unifiedKnowledgeStore.buildFromText(projectId, conversationText);

  // Index new memories and nodes in parallel
  await Promise.all([
    ...memories.map(memory => unifiedKnowledgeStore.indexItem(memory.id, 'memory')),
    ...nodes.map(node => unifiedKnowledgeStore.indexItem(node.id, 'knowledge')),
  ]);

  return {
    memoriesCreated: memories.length,
    nodesCreated: nodes.length,
    edgesCreated: edges.length,
  };
}

/**
 * Perform periodic maintenance on memories:
 * - Apply decay to reduce relevance of old memories
 * - Prune memories that have decayed below threshold
 * - Consolidate clusters of similar memories
 * - Index any unindexed items
 */
export async function performMaintenance(projectId: string): Promise<{
  decayedCount: number;
  prunedCount: number;
  consolidatedCount: number;
  indexedCount: number;
}> {
  const decayedCount = unifiedKnowledgeStore.applyMemoryDecay(projectId, 0.99);
  const prunedCount = unifiedKnowledgeStore.pruneOldMemories(projectId, 0.01);

  // Find clusters of similar memories for consolidation
  const clusters = await unifiedKnowledgeStore.clusterMemories(projectId, 0.8);
  let consolidatedCount = 0;

  for (const cluster of clusters) {
    if (cluster.length >= 3) {
      const memoryIds = cluster.map(m => m.id);
      const consolidated = await unifiedKnowledgeStore.consolidateMemories(projectId, memoryIds);
      if (consolidated) {
        consolidatedCount += memoryIds.length;
      }
    }
  }

  // Index any unindexed items
  const indexed = await unifiedKnowledgeStore.indexAllUnindexed(projectId);

  return {
    decayedCount,
    prunedCount,
    consolidatedCount,
    indexedCount: indexed.memories + indexed.nodes,
  };
}
