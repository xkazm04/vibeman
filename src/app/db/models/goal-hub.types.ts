/**
 * Goal Hub Types
 * Types for the goal-driven development orchestration system
 */

// ============================================================================
// HYPOTHESIS TYPES
// ============================================================================

export type HypothesisStatus = 'unverified' | 'in_progress' | 'verified' | 'disproven';
export type HypothesisCategory =
  | 'behavior'      // Expected function/feature behavior
  | 'performance'   // Performance characteristics
  | 'security'      // Security requirements
  | 'accessibility' // Accessibility requirements
  | 'ux'            // User experience
  | 'integration'   // Integration requirements
  | 'edge_case'     // Edge case handling
  | 'data'          // Data integrity/flow
  | 'error'         // Error handling
  | 'custom';       // User-defined

export type VerificationMethod = 'manual' | 'automated' | 'test' | 'review';
export type EvidenceType = 'pr' | 'commit' | 'test_result' | 'screenshot' | 'manual_note' | 'implementation_log';

export interface DbGoalHypothesis {
  id: string;
  goal_id: string;
  project_id: string;
  title: string;
  statement: string;
  reasoning: string | null;
  category: HypothesisCategory;
  priority: number;
  agent_source: string | null;
  status: HypothesisStatus;
  verification_method: VerificationMethod;
  evidence: string | null;
  evidence_type: EvidenceType | null;
  verified_at: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface GoalHypothesis {
  id: string;
  goalId: string;
  projectId: string;
  title: string;
  statement: string;
  reasoning: string | null;
  category: HypothesisCategory;
  priority: number;
  agentSource: string | null;
  status: HypothesisStatus;
  verificationMethod: VerificationMethod;
  evidence: string | null;
  evidenceType: EvidenceType | null;
  verifiedAt: Date | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// BREAKDOWN TYPES
// ============================================================================

export interface AgentResponse {
  agentType: string;
  agentLabel: string;
  agentEmoji: string;
  perspective: string;
  recommendations: string[];
  hypotheses: Array<{
    title: string;
    statement: string;
    category: HypothesisCategory;
    priority: number;
  }>;
  risks: string[];
  considerations: string[];
}

export interface DbGoalBreakdown {
  id: string;
  goal_id: string;
  project_id: string;
  prompt_used: string | null;
  model_used: string | null;
  input_tokens: number;
  output_tokens: number;
  agent_responses: string; // JSON string of AgentResponse[]
  hypotheses_generated: number;
  created_at: string;
}

export interface GoalBreakdown {
  id: string;
  goalId: string;
  projectId: string;
  promptUsed: string | null;
  modelUsed: string | null;
  inputTokens: number;
  outputTokens: number;
  agentResponses: AgentResponse[];
  hypothesesGenerated: number;
  createdAt: Date;
}

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
  hypotheses_total: number;
  hypotheses_verified: number;
  target_date: string | null;
  started_at: string | null;
  completed_at: string | null;
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
  hypothesesTotal: number;
  hypothesesVerified: number;
  targetDate: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateHypothesisInput {
  goalId: string;
  projectId: string;
  title: string;
  statement: string;
  reasoning?: string;
  category?: HypothesisCategory;
  priority?: number;
  agentSource?: string;
}

export interface UpdateHypothesisInput {
  title?: string;
  statement?: string;
  reasoning?: string;
  category?: HypothesisCategory;
  priority?: number;
  status?: HypothesisStatus;
  verificationMethod?: VerificationMethod;
  evidence?: string;
  evidenceType?: EvidenceType;
}

export interface VerifyHypothesisInput {
  evidence: string;
  evidenceType: EvidenceType;
}

export interface GoalBreakdownRequest {
  goalId: string;
  projectId: string;
  goalTitle: string;
  goalDescription?: string;
  projectPath: string;
  contextFiles?: string[];
}

export interface GoalBreakdownResponse {
  breakdown: GoalBreakdown;
  hypotheses: GoalHypothesis[];
}

// ============================================================================
// GOAL HUB STATE
// ============================================================================

export interface GoalHubState {
  activeGoal: ExtendedGoal | null;
  goals: ExtendedGoal[];
  hypotheses: GoalHypothesis[];
  breakdown: GoalBreakdown | null;
  isLoading: boolean;
  isGeneratingBreakdown: boolean;
  error: string | null;
}
