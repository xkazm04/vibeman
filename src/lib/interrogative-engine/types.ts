/**
 * Interrogative Engine Types
 *
 * Generic types for the reusable "interrogative development" pattern:
 * generate probing items → present to user → user decides → convert to actions.
 *
 * Used by: Questions/Directions, Tinder, DecisionQueue, RefactorWizard,
 * TechDebt prioritization, Security review, Backlog proposals.
 */

// ============================================================================
// ITEM STATUS
// ============================================================================

/**
 * Universal status lifecycle for interrogative items.
 * All features map their domain-specific statuses to this.
 */
export type ItemStatus = 'pending' | 'answered' | 'accepted' | 'rejected' | 'processing';

// ============================================================================
// CORE ITEM
// ============================================================================

/**
 * Minimal contract for any item that flows through the interrogative engine.
 * Domain features extend this with their own fields.
 */
export interface InterrogativeItem {
  id: string;
  status: ItemStatus;
  createdAt: number; // ms timestamp
}

// ============================================================================
// DECISION OUTCOMES
// ============================================================================

/** Result of accepting an item */
export interface AcceptResult {
  success: boolean;
  /** ID of the action created (requirement, task, etc.) */
  actionId?: string;
  /** Path to created artifact (requirement file, etc.) */
  actionPath?: string;
  error?: string;
}

/** Result of answering an item (for question-style flows) */
export interface AnswerResult {
  success: boolean;
  /** Optional side-effect ID (e.g. auto-created goal) */
  sideEffectId?: string;
  error?: string;
}

// ============================================================================
// STRATEGIES
// ============================================================================

/**
 * Generation strategy - how to create new interrogative items.
 * Can be LLM-backed, analysis-backed, rule-backed, etc.
 */
export interface GenerationStrategy<T extends InterrogativeItem, TConfig = unknown> {
  /** Generate items from the given config/context */
  generate: (config: TConfig) => Promise<T[]>;
}

/**
 * Decision strategy - what happens when user accepts, rejects, or answers an item.
 * Each feature provides domain-specific behavior.
 */
export interface DecisionStrategy<T extends InterrogativeItem> {
  /** Handle item acceptance. Returns result with optional action ID/path. */
  onAccept: (item: T) => Promise<AcceptResult>;
  /** Handle item rejection. Optional - defaults to status update only. */
  onReject?: (item: T) => Promise<void>;
  /** Handle item answer (for question-style flows). */
  onAnswer?: (item: T, answer: string) => Promise<AnswerResult>;
}

/**
 * Persistence strategy - where and how items are stored.
 * Mirrors the session-lifecycle pattern.
 */
export interface ItemPersistence<T extends InterrogativeItem> {
  getAll: () => T[] | Promise<T[]>;
  getById: (id: string) => T | null | Promise<T | null>;
  save: (item: T) => void | Promise<void>;
  updateStatus: (id: string, status: ItemStatus) => void | Promise<void>;
  delete: (id: string) => boolean | Promise<boolean>;
}

// ============================================================================
// HOOKS
// ============================================================================

/** Optional event hooks for side-effects at each stage */
export interface InterrogativeHooks<T extends InterrogativeItem> {
  /** Called after items are generated */
  onGenerated?: (items: T[]) => void | Promise<void>;
  /** Called before an accept decision is processed */
  beforeAccept?: (item: T) => boolean | Promise<boolean>;
  /** Called after successful accept */
  afterAccept?: (item: T, result: AcceptResult) => void | Promise<void>;
  /** Called after rejection */
  afterReject?: (item: T) => void | Promise<void>;
  /** Called after an answer is saved */
  afterAnswer?: (item: T, answer: string, result: AnswerResult) => void | Promise<void>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface InterrogativeEngineConfig<T extends InterrogativeItem, TGenConfig = unknown> {
  /** Unique name for this engine instance (for logging) */
  name: string;
  /** Where items are stored */
  persistence: ItemPersistence<T>;
  /** How items are generated */
  generation?: GenerationStrategy<T, TGenConfig>;
  /** What happens when user decides */
  decision: DecisionStrategy<T>;
  /** Optional event hooks */
  hooks?: InterrogativeHooks<T>;
}

// ============================================================================
// ENGINE STATE
// ============================================================================

/** Counts by status for display in UI */
export interface ItemCounts {
  pending: number;
  answered: number;
  accepted: number;
  rejected: number;
  processing: number;
  total: number;
}
