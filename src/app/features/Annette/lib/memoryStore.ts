/**
 * Annette Memory Store
 *
 * Thin facade over UnifiedKnowledgeStore for backward compatibility.
 * All logic has been consolidated into unifiedKnowledgeStore.ts.
 */

import { unifiedKnowledgeStore } from './unifiedKnowledgeStore';

export type {
  Memory,
  MemoryCreateInput,
  MemorySearchOptions,
} from './unifiedKnowledgeStore';

export const memoryStore = {
  create: unifiedKnowledgeStore.createMemory.bind(unifiedKnowledgeStore),
  getById: unifiedKnowledgeStore.getMemory.bind(unifiedKnowledgeStore),
  getByProject: unifiedKnowledgeStore.getMemories.bind(unifiedKnowledgeStore),
  updateImportance: unifiedKnowledgeStore.updateMemoryImportance.bind(unifiedKnowledgeStore),
  applyDecay: unifiedKnowledgeStore.applyMemoryDecay.bind(unifiedKnowledgeStore),
  delete: unifiedKnowledgeStore.deleteMemory.bind(unifiedKnowledgeStore),
  pruneOld: unifiedKnowledgeStore.pruneOldMemories.bind(unifiedKnowledgeStore),
  extractFromConversation: unifiedKnowledgeStore.extractMemoriesFromConversation.bind(unifiedKnowledgeStore),
  consolidateMemories: unifiedKnowledgeStore.consolidateMemories.bind(unifiedKnowledgeStore),
  getConsolidationStats: unifiedKnowledgeStore.getConsolidationStats.bind(unifiedKnowledgeStore),
};
