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

// Lib
export { memoryStore } from './lib/memoryStore';
export type {
  Memory,
  MemoryCreateInput,
  MemorySearchOptions,
} from './lib/memoryStore';

export { knowledgeGraph } from './lib/knowledgeGraph';
export type {
  KnowledgeNode,
  KnowledgeEdge,
  ExtractedEntity,
  ExtractedRelationship,
} from './lib/knowledgeGraph';

export { semanticIndexer } from './lib/semanticIndexer';

export { contextualRecaller } from './lib/contextualRecaller';
export type {
  RecallContext,
  RecalledContext,
  ConversationContext,
} from './lib/contextualRecaller';
