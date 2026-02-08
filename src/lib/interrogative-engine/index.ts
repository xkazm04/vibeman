/**
 * Interrogative Engine Module
 *
 * Reusable abstraction for the "interrogative development" pattern:
 * generate probing items → present to user → user decides → convert to actions.
 *
 * This pattern appears in 6+ features across Vibeman:
 * - Questions & Directions (strategic exploration)
 * - Tinder / Ideas evaluation (swipe-style decisions)
 * - DecisionQueue (sequential scan result processing)
 * - RefactorWizard (technique selection)
 * - TechDebt prioritization
 * - Backlog proposals
 *
 * Usage:
 *   import { createDirectionsEngine } from '@/lib/interrogative-engine';
 *   const engine = createDirectionsEngine(projectId, projectPath);
 *   await engine.accept(directionId);
 */

// Core
export { InterrogativeEngine } from './InterrogativeEngine';

// Types
export type {
  ItemStatus,
  InterrogativeItem,
  AcceptResult,
  AnswerResult,
  GenerationStrategy,
  DecisionStrategy,
  ItemPersistence,
  InterrogativeHooks,
  InterrogativeEngineConfig,
  ItemCounts,
} from './types';

// Persistence strategies
export { InMemoryItemPersistence, ApiItemPersistence } from './persistence';
export type { ApiItemPersistenceConfig } from './persistence';

// Presets (feature-specific factories)
export {
  createQuestionsEngine,
  createDirectionsEngine,
  createDecisionQueueEngine,
  createTinderEngine,
  createProposalEngine,
} from './presets';

export type {
  QuestionItem,
  QuestionGenConfig,
  DirectionItem,
  DirectionGenConfig,
  DecisionQueueItem,
  TinderItem,
  ProposalItem,
} from './presets';
