/**
 * Goal Hub Types
 * Types for the goal-driven development orchestration system
 */

// ============================================================================
// EXTENDED GOAL TYPE
// ============================================================================

export interface ExtendedDbGoal {
  id: string;
  project_id: string;
  context_id: string | null;
  order_index: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  progress: number;
  target_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  github_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtendedGoal {
  id: string;
  projectId: string;
  contextId: string | null;
  orderIndex: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  progress: number;
  targetDate: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  githubItemId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// GOAL HUB STATE
// ============================================================================

export interface GoalHubState {
  activeGoal: ExtendedGoal | null;
  goals: ExtendedGoal[];
  isLoading: boolean;
  error: string | null;
}
