/**
 * Annette Knowledge Graph
 *
 * Thin facade over UnifiedKnowledgeStore for backward compatibility.
 * All logic has been consolidated into unifiedKnowledgeStore.ts.
 */

import { unifiedKnowledgeStore } from './unifiedKnowledgeStore';

export type {
  KnowledgeNode,
  KnowledgeEdge,
  ExtractedEntity,
  ExtractedRelationship,
  ExtractionResult,
} from './unifiedKnowledgeStore';

export { buildEdgeMap } from './unifiedKnowledgeStore';

export const knowledgeGraph = {
  upsertNode: unifiedKnowledgeStore.upsertNode.bind(unifiedKnowledgeStore),
  upsertEdge: unifiedKnowledgeStore.upsertEdge.bind(unifiedKnowledgeStore),
  getNode: unifiedKnowledgeStore.getNode.bind(unifiedKnowledgeStore),
  getNodeByName: unifiedKnowledgeStore.getNodeByName.bind(unifiedKnowledgeStore),
  getNodes: unifiedKnowledgeStore.getNodes.bind(unifiedKnowledgeStore),
  searchNodes: unifiedKnowledgeStore.searchNodes.bind(unifiedKnowledgeStore),
  getRelatedNodes: unifiedKnowledgeStore.getRelatedNodes.bind(unifiedKnowledgeStore),
  getEdges: unifiedKnowledgeStore.getEdges.bind(unifiedKnowledgeStore),
  getAllEdges: unifiedKnowledgeStore.getAllEdges.bind(unifiedKnowledgeStore),
  deleteNode: unifiedKnowledgeStore.deleteNode.bind(unifiedKnowledgeStore),
  deleteEdge: unifiedKnowledgeStore.deleteEdge.bind(unifiedKnowledgeStore),
  getGraph: unifiedKnowledgeStore.getGraph.bind(unifiedKnowledgeStore),
  getStats: unifiedKnowledgeStore.getGraphStats.bind(unifiedKnowledgeStore),
  extractFromText: unifiedKnowledgeStore.extractFromText.bind(unifiedKnowledgeStore),
  buildFromText: unifiedKnowledgeStore.buildFromText.bind(unifiedKnowledgeStore),
  query: unifiedKnowledgeStore.queryGraph.bind(unifiedKnowledgeStore),
};
