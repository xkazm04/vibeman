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
  evidence: string;
  blockers: string[];
  progress: number;                  // 0-100
  confidence: number;                // 0-100
  reasoning: string;
}

export interface GoalStatusChange {
  goalId: string;
  goalTitle: string;
  previousStatus: string;
  newStatus: string;
  evidence: string;
  changedAt: string;
  autoApplied: boolean;
}

// ============ Goal Generation Types ============

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
  | 'failed';

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
