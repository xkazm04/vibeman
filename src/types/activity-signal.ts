/**
 * Unified ActivitySignal Abstraction
 *
 * Single interface that normalizes signals across three domains:
 * - Goal signals (goal_signals table, type+weight+delta)
 * - Behavioral signals (behavioral_signals table, weight-based decay)
 * - Standup/velocity signals (derived from behavioral signals)
 *
 * All consumers (goalLifecycleEngine.processSignal, signalProcessor.computeVelocityMetrics,
 * predictiveStandupEngine) can query the same unified stream, eliminating
 * redundant aggregation logic.
 */

import type { GoalSignalType } from '@/app/db/models/types';
import type { BehavioralSignalType } from '@/types/signals';

/**
 * The origin database/domain of a signal
 */
export type ActivitySignalSource = 'goal' | 'behavioral';

/**
 * Union of all signal types across domains
 */
export type ActivitySignalType = GoalSignalType | BehavioralSignalType;

/**
 * Unified signal interface that all domain-specific signals map to.
 * Provides a single shape for cross-domain queries and aggregation.
 */
export interface ActivitySignal {
  /** Original signal ID */
  id: string;
  /** Which domain produced this signal */
  source: ActivitySignalSource;
  /** Signal type (GoalSignalType or BehavioralSignalType) */
  type: ActivitySignalType;
  /** Normalized weight (goal: progress_delta, behavioral: weight field) */
  weight: number;
  /** Project this signal belongs to */
  projectId: string;
  /** Context ID if available (goal signals derive from goal.context_id) */
  contextId: string | null;
  /** ISO timestamp of when the signal occurred */
  timestamp: string;
  /** Optional structured payload (behavioral signal data, goal metadata) */
  data?: string | null;
  /** Optional human-readable description */
  description?: string | null;
  /** Goal ID for goal-sourced signals */
  goalId?: string | null;
  /** Source entity that triggered this signal */
  sourceEntityId?: string | null;
}

/**
 * Options for querying the unified activity stream
 */
export interface ActivityStreamQuery {
  projectId: string;
  /** Filter to a specific context */
  contextId?: string;
  /** Filter to specific source domains */
  sources?: ActivitySignalSource[];
  /** Filter to specific signal types */
  types?: ActivitySignalType[];
  /** Only signals after this ISO timestamp */
  since?: string;
  /** Only signals before this ISO timestamp */
  until?: string;
  /** Max signals to return (default 100) */
  limit?: number;
}

/**
 * Aggregated activity stats for a context or project
 */
export interface ActivityAggregate {
  contextId: string | null;
  contextName?: string;
  signalCount: number;
  totalWeight: number;
  /** Breakdown by source domain */
  bySource: Record<ActivitySignalSource, { count: number; weight: number }>;
}
