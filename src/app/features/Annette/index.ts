/**
 * Annette Feature Module
 * AI Voice Assistant with persistent memory and knowledge graph
 */

// Components
export { MiniTerminal } from './components/MiniTerminal';
export type { MiniTerminalProps } from './components/MiniTerminal';

// Hooks
export { useAnnetteSession } from './hooks/useAnnetteSession';
export type {
  AnnetteMessage,
  AnnetteSession,
} from './hooks/useAnnetteSession';

// Unified Knowledge Store (primary API)
export { unifiedKnowledgeStore, buildEdgeMap } from './lib/unifiedKnowledgeStore';
export type {
  KnowledgeNode,
  KnowledgeEdge,
  ExtractedEntity,
  ExtractedRelationship,
  Memory,
  MemoryCreateInput,
  MemorySearchOptions,
  SimilarityResult,
} from './lib/unifiedKnowledgeStore';

// Legacy facades (delegate to unified store)
export { memoryStore } from './lib/memoryStore';
export { knowledgeGraph } from './lib/knowledgeGraph';
export { semanticIndexer } from './lib/semanticIndexer';

export { contextualRecaller } from './lib/contextualRecaller';
export type {
  RecallContext,
  RecalledContext,
  ConversationContext,
} from './lib/contextualRecaller';
