/**
 * Standup Automation Types
 * TypeScript interfaces for the LLM-powered standup automation system
 */

import { DbGoal, DbIdea, DbImplementationLog } from '@/app/db/models/types';
import type { GoalHypothesis } from '@/app/db/models/goal-hub.types';
import type { SupportedProvider } from '@/lib/llm/types';

// ============ Configuration Types ============

export type AutonomyLevel = 'suggest' | 'cautious' | 'autonomous';
export type GoalStrategy = 'build' | 'polish';

export interface StandupAutomationConfig {
  enabled: boolean;
  intervalMinutes: number;           // Default: 120 (every 2 hours)
  projectIds: string[] | 'all';      // Projects to process
  autonomyLevel: AutonomyLevel;      // How aggressive the automation is
  strategy: GoalStrategy;            // Build (new features) vs Polish (refactor/improve)
  modes: {
    evaluateGoals: boolean;          // Analyze goal completion
    updateStatuses: boolean;         // Auto-update goal statuses
    generateGoals: boolean;          // Create new goal candidates
    createAnalysisTasks: boolean;    // Create Claude Code requirements
  };
  llmProvider?: SupportedProvider;   // Override default provider
  notifyOnChanges: boolean;          // UI notifications
}

export const DEFAULT_CONFIG: StandupAutomationConfig = {
  enabled: false,
  intervalMinutes: 120,
  projectIds: 'all',
  autonomyLevel: 'cautious',
  strategy: 'build',
  modes: {
    evaluateGoals: true,
    updateStatuses: true,
    generateGoals: true,
    createAnalysisTasks: true,
  },
  notifyOnChanges: true,
};

// ============ Evidence Types ============

/**
 * A reference to a specific location in code that serves as evidence
 */
export interface CodeReference {
  file: string;                    // File path relative to project root
  startLine: number;               // 1-based line number
  endLine?: number;                // Optional end line for multi-line references
  snippet?: string;                // 1-3 lines of relevant code
  relevance: string;               // Why this code is evidence
}

/**
 * Verification methods for evidence
 */
export type VerificationMethod = 'code_exists' | 'test_passes' | 'pattern_match' | 'manual' | 'hypothesis_verified';

/**
 * Structured evidence with file:line references for verifiable findings
 */
export interface StructuredEvidence {
  summary: string;                 // Human-readable summary
  references: CodeReference[];     // Specific code locations
  confidence: number;              // 0-100
  verificationMethod: VerificationMethod;
  verifiedAt?: string;             // ISO timestamp when verified
}

// ============ Goal Evaluation Types ============

export interface GoalEvaluationContext {
  goal: DbGoal;
  hypotheses: GoalHypothesis[];
  relatedImplementations: DbImplementationLog[];
  relatedIdeas: DbIdea[];
  contextActivity: {
    filesChanged: number;
    commitsCount: number;
    lastActivity: string | null;
  };
  periodStats: {
    implementationsThisPeriod: number;
    ideasImplemented: number;
  };
}

export interface GoalEvaluationResult {
  goalId: string;
  shouldUpdate: boolean;
  currentStatus: string;
  recommendedStatus?: string;

  // Evidence - supports both legacy string and structured format
  evidence: string | StructuredEvidence;

  // Legacy fields (kept for backward compatibility)
  blockers: string[];
  progress: number;                  // 0-100
  confidence: number;                // 0-100
  reasoning: string;

  // Optional hypothesis verifications from this evaluation
  hypothesisVerifications?: Array<{
    hypothesisId: string;
    verified: boolean;
    evidence: StructuredEvidence;
  }>;
}

export interface GoalStatusChange {
  goalId: string;
  goalTitle: string;
  previousStatus: string;
  newStatus: string;
  evidence: string | StructuredEvidence;
  changedAt: string;
  autoApplied: boolean;
}

// ============ Goal Generation Types ============

/**
 * Goal time horizon for strategic planning
 */
export type GoalHorizon = 'immediate' | 'short_term' | 'medium_term' | 'long_term';

/**
 * Strategic themes that goals can align with
 */
export type StrategicTheme =
  | 'user_experience'       // Delight users, improve usability
  | 'technical_excellence'  // Code quality, architecture, maintainability
  | 'velocity'              // Development speed, deployment frequency
  | 'reliability'           // Uptime, stability, graceful degradation
  | 'security'              // Protection, compliance, defense-in-depth
  | 'scalability'           // Growth capacity, performance at scale
  | 'developer_experience'  // Team productivity, tooling, documentation
  | 'innovation';           // New capabilities, experimentation

export interface GoalCandidate {
  title: string;
  description: string;
  reasoning: string;
  priorityScore: number;             // 0-100
  suggestedContext?: string;
  category: string;
  source: 'tech_debt' | 'ideas_backlog' | 'pattern_detection' | 'historical';
  relatedItems?: string[];           // IDs of related tech debt, ideas, etc.
}

/**
 * Strategic goal candidate with vision-level attributes
 * Used for generating high-level strategic goals rather than tactical backlog items
 */
export interface StrategicGoalCandidate extends GoalCandidate {
  horizon: GoalHorizon;              // When should this be achieved?
  strategicTheme: StrategicTheme;    // What strategic pillar does this serve?
  businessValue: string;             // Why stakeholders care
  successVision: string;             // Concrete definition of "done"
  potentialInitiatives: string[];    // Tactical work this might spawn
}

export interface GoalGenerationContext {
  projectId: string;
  projectName: string;
  completedGoals: DbGoal[];
  openGoals: DbGoal[];
  pendingIdeas: DbIdea[];
  techDebtItems: { id: string; title: string; severity: string }[];
  recentFocusAreas: string[];
}

export interface GoalGenerationResult {
  candidates: GoalCandidate[];
  tokensUsed: { input: number; output: number };
  generatedAt: string;
}

// ============ Task Creation Types ============

export type TaskType = 'goal_analysis' | 'goal_breakdown' | 'progress_check' | 'blocker_resolution';

export interface TaskCreationRequest {
  type: TaskType;
  goalId: string;
  goalTitle: string;
  projectPath: string;
  contextName?: string;
  additionalContext?: string;
}

export interface CreatedTask {
  requirementName: string;
  requirementPath: string;
  taskType: TaskType;
  goalId: string;
  createdAt: string;
}

// ============ Automation Cycle Types ============

export interface AutomationCycleResult {
  id: string;
  projectId: string;
  projectName: string;
  timestamp: string;
  duration: number;                  // ms
  goalsEvaluated: number;
  statusesUpdated: GoalStatusChange[];
  goalsGenerated: GoalCandidate[];
  tasksCreated: CreatedTask[];
  tokensUsed: { input: number; output: number };
  errors: string[];
}

export interface AutomationStatus {
  running: boolean;
  lastRun: string | null;
  nextRun: string | null;
  currentProjectId: string | null;
  cycleInProgress: boolean;
  totalCyclesRun: number;
  stats: {
    goalsEvaluated: number;
    statusesUpdated: number;
    goalsGenerated: number;
    tasksCreated: number;
  };
}

// ============ Scheduler Types ============

export interface SchedulerState {
  isRunning: boolean;
  intervalId: NodeJS.Timeout | null;
  config: StandupAutomationConfig;
  lastCycleResult: AutomationCycleResult | null;
  history: AutomationCycleResult[];
}

// ============ LLM Response Types ============

export interface LLMGoalEvaluationResponse {
  shouldUpdate: boolean;
  newStatus?: 'open' | 'in_progress' | 'done' | 'rejected';
  evidence: string;
  blockers: string[];
  progress: number;
  confidence: number;
  reasoning: string;
}

export interface LLMGoalGenerationResponse {
  goals: {
    title: string;
    description: string;
    reasoning: string;
    priorityScore: number;
    suggestedContext?: string;
    category: string;
  }[];
}

// ============ Claude Code Automation Session Types ============

export type AutomationSessionPhase =
  | 'pending'
  | 'running'
  | 'exploring'
  | 'generating'
  | 'evaluating'
  | 'complete'
  | 'failed'
  | 'paused';

export interface AutomationSession {
  id: string;
  projectId: string;
  projectPath: string;
  phase: AutomationSessionPhase;
  taskId?: string;                 // Claude execution queue task ID
  claudeSessionId?: string;        // Claude CLI session for --resume
  startedAt: string;
  completedAt?: string;
  config: StandupAutomationConfig;
  result?: AutomationCycleResult;
  errorMessage?: string;
}

export interface AutomationExecutionRequest {
  projectId: string;
  projectPath: string;
  modes: StandupAutomationConfig['modes'];
  strategy: GoalStrategy;
  autonomyLevel: AutonomyLevel;
  resumeSessionId?: string;        // Claude CLI session to resume
}

export interface AutomationProgressUpdate {
  sessionId: string;
  phase: AutomationSessionPhase;
  progress: number;                // 0-100
  message: string;
  details?: Record<string, unknown>;
}

// API callback types for Claude Code to submit results
export interface CandidateSubmission {
  projectId: string;
  sessionId: string;
  claudeSessionId?: string;
  candidates: GoalCandidate[];
  metadata: {
    explorationSummary: string;
    filesAnalyzed: string[];
    patternsIdentified: string[];
  };
  tokensUsed?: { input: number; output: number };
}

export interface EvaluationSubmission {
  projectId: string;
  sessionId: string;
  claudeSessionId?: string;
  evaluations: GoalEvaluationResult[];
  metadata: {
    goalsAnalyzed: number;
    codebaseChangesDetected: string[];
    implementationEvidence: Record<string, string[]>;
  };
  tokensUsed?: { input: number; output: number };
}
