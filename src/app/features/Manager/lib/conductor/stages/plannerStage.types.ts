/**
 * Planner Stage Types
 *
 * The Planner runs between Goal Analyzer and Scout in goal-driven runs.
 * It structures the raw backlog into a dependency graph and groups
 * related items into composite specs for efficient execution.
 */

import type { BalancingConfig } from '../types';
import type { BacklogItemInput, GapReport } from './goalAnalyzer.types';

// ============================================================================
// Planner Input
// ============================================================================

export interface PlannerInput {
  runId: string;
  projectId: string;
  projectPath: string;
  goal: {
    id: string;
    title: string;
    description: string;
    target_paths?: string | null;
    use_brain?: boolean | number;
  };
  gapReport: GapReport;
  backlogItems: BacklogItemInput[];
  config: BalancingConfig;
  refinedIntent?: string | null;
  abortSignal?: AbortSignal;
}

// ============================================================================
// Planner Output
// ============================================================================

export interface PlannerBacklogItem extends BacklogItemInput {
  /** Stable ID assigned by the planner for dependency references */
  itemId: string;
  /** Group ID if this item belongs to a composite group */
  plannerGroupId?: string;
  /** Item IDs this item depends on (must complete before this starts) */
  dependencies: string[];
}

export interface CompositeGroup {
  groupId: string;
  title: string;
  itemIds: string[];
  rationale: string;
}

export interface PlannerOutput {
  backlogItems: PlannerBacklogItem[];
  compositeGroups: CompositeGroup[];
}
