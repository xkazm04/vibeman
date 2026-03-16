/**
 * Conductor v3 Types
 *
 * 3-phase adaptive pipeline: PLAN → DISPATCH → REFLECT
 * Connected by bidirectional Brain. 2 LLM calls per cycle.
 */

import type { CLIProvider } from '@/lib/claude-terminal/types';
import type {
  PipelineStatus,
  BalancingConfig,
  ModelRoutingRule,
  QuotaLimits,
  StageState,
  ProcessLogEntry,
} from '../types';

// ============================================================================
// Phase Identifiers
// ============================================================================

export type V3Phase = 'plan' | 'dispatch' | 'reflect';

export const V3_PHASES: V3Phase[] = ['plan', 'dispatch', 'reflect'];

// ============================================================================
// Task Model (replaces SpecMetadata + BacklogItem)
// ============================================================================

export interface V3Task {
  id: string;
  title: string;
  description: string;
  targetFiles: string[];
  complexity: 1 | 2 | 3;
  dependsOn: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: V3TaskResult;
}

export interface V3TaskResult {
  success: boolean;
  error?: string;
  filesChanged: string[];
  durationMs: number;
  provider: string;
  model: string;
  commitSha?: string;
}

// ============================================================================
// Phase Outputs
// ============================================================================

export interface PlanOutput {
  tasks: V3Task[];
  rationale: string;
  brainWarningsApplied: string[];
}

export interface ReflectOutput {
  status: 'done' | 'continue' | 'needs_input';
  summary: string;
  nextTasks?: V3Task[];
  brainFeedback: string;
  lessonsLearned: string[];
}

// ============================================================================
// V3 Configuration
// ============================================================================

export interface V3Config {
  // Pipeline version flag
  pipelineVersion: 3;

  // PLAN phase
  planProvider: CLIProvider;
  planModel: string | null;

  // DISPATCH phase (reuses execute settings)
  maxConcurrentTasks: number;
  executionProvider: CLIProvider;
  executionModel: string | null;
  executionTimeoutMs: number;
  modelRouting: ModelRoutingRule[];

  // REFLECT phase
  reflectProvider: CLIProvider;
  reflectModel: string | null;

  // Brain
  brainQuestionsEnabled: boolean;

  // Budget
  maxCyclesPerRun: number;
  quotaLimits: QuotaLimits;

  // Self-healing
  healingEnabled: boolean;
  healingThreshold: number;

  // Batch (for dispatch scheduling)
  maxBatchSize: number;

  // Git
  autoCommit: boolean;

  // Experimental
  experimentalAgentTeams: boolean;
}

export const DEFAULT_V3_CONFIG: V3Config = {
  pipelineVersion: 3,

  // PLAN
  planProvider: 'claude',
  planModel: null,

  // DISPATCH
  maxConcurrentTasks: 2,
  executionProvider: 'claude',
  executionModel: null,
  executionTimeoutMs: 6000 * 1000,
  modelRouting: [
    { condition: 'complexity_1', provider: 'claude', model: 'sonnet' },
    { condition: 'complexity_2', provider: 'claude', model: 'opus' },
    { condition: 'complexity_3', provider: 'claude', model: 'opus' },
    { condition: 'default', provider: 'claude', model: 'sonnet' },
  ],

  // REFLECT
  reflectProvider: 'claude',
  reflectModel: null,

  // Brain
  brainQuestionsEnabled: false,

  // Budget
  maxCyclesPerRun: 3,
  quotaLimits: {
    maxApiCallsPerHour: 100,
    maxTokensPerRun: 500000,
    enabled: false,
  },

  // Self-healing
  healingEnabled: true,
  healingThreshold: 3,

  // Batch
  maxBatchSize: 5,

  // Git
  autoCommit: false,

  // Experimental
  experimentalAgentTeams: false,
};

// ============================================================================
// V3 Metrics
// ============================================================================

export interface V3Metrics {
  tasksPlanned: number;
  tasksCompleted: number;
  tasksFailed: number;
  totalCycles: number;
  totalDurationMs: number;
  llmCallCount: number;
  estimatedCost: number;
  healingPatchesApplied: number;
}

export function createEmptyV3Metrics(): V3Metrics {
  return {
    tasksPlanned: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    totalCycles: 0,
    totalDurationMs: 0,
    llmCallCount: 0,
    estimatedCost: 0,
    healingPatchesApplied: 0,
  };
}

// ============================================================================
// Phase State (reuses StageState shape for compatibility)
// ============================================================================

/** V3 uses the same StageState shape as v2 for DB/UI compatibility */
export type PhaseState = StageState;

export function createEmptyV3Phases(): Record<V3Phase, PhaseState> {
  return {
    plan: { status: 'pending', itemsIn: 0, itemsOut: 0 },
    dispatch: { status: 'pending', itemsIn: 0, itemsOut: 0 },
    reflect: { status: 'pending', itemsIn: 0, itemsOut: 0 },
  };
}

// ============================================================================
// V3 Pipeline Run
// ============================================================================

export interface V3PipelineRun {
  id: string;
  projectId: string;
  goalId: string;
  status: PipelineStatus;
  currentPhase: V3Phase;
  cycle: number;
  config: V3Config;
  phases: Record<V3Phase, PhaseState>;
  startedAt: string;
  completedAt?: string;
  metrics: V3Metrics;
  reflectionHistory: ReflectOutput[];
}

// ============================================================================
// V3 Process Log (extends base ProcessLogEntry to accept V3Phase)
// ============================================================================

export interface V3ProcessLogEntry extends Omit<ProcessLogEntry, 'stage' | 'metrics'> {
  stage: V3Phase;
  metrics?: V3Metrics;
}

// ============================================================================
// Phase UI Config
// ============================================================================

export interface V3PhaseConfig {
  id: V3Phase;
  label: string;
  description: string;
  icon: string;
  activeColor: string;
  completedColor: string;
}

export const V3_PHASE_CONFIGS: V3PhaseConfig[] = [
  {
    id: 'plan',
    label: 'Plan',
    description: 'Analyze goal and generate task list',
    icon: 'Brain',
    activeColor: 'cyan',
    completedColor: 'emerald',
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    description: 'Execute tasks with parallel scheduling',
    icon: 'Zap',
    activeColor: 'purple',
    completedColor: 'emerald',
  },
  {
    id: 'reflect',
    label: 'Reflect',
    description: 'Review results and adapt for next cycle',
    icon: 'Sparkles',
    activeColor: 'pink',
    completedColor: 'emerald',
  },
];

// ============================================================================
// Helper: Convert V3Config to BalancingConfig (for infrastructure reuse)
// ============================================================================

/**
 * Build a BalancingConfig from V3Config for reusing v2 infrastructure
 * (e.g., routeModel, checkQuota) that expects BalancingConfig.
 */
export function v3ConfigToBalancing(v3: V3Config): BalancingConfig {
  return {
    // Scout defaults (unused in v3, but type requires them)
    scanTypes: [],
    scanStrategy: 'rotate',
    contextStrategy: 'all',
    contextIds: [],
    maxIdeasPerCycle: 0,
    scanProvider: v3.planProvider,
    scanModel: v3.planModel,
    maxConcurrentScans: 1,

    // Triage defaults (unused in v3)
    autoTriageThreshold: 0,
    minImpact: 0,
    maxEffort: 10,
    maxRisk: 10,
    triageProvider: v3.planProvider,
    triageModel: v3.planModel,

    // Batch
    maxBatchSize: v3.maxBatchSize,
    batchStrategy: 'dag',
    maxConcurrentTasks: v3.maxConcurrentTasks,

    // Execute
    executionProvider: v3.executionProvider,
    executionModel: v3.executionModel,
    executionTimeoutMs: v3.executionTimeoutMs,
    modelRouting: v3.modelRouting,

    // Budget
    maxCyclesPerRun: v3.maxCyclesPerRun,
    quotaLimits: v3.quotaLimits,

    // Self-healing
    healingEnabled: v3.healingEnabled,
    healingThreshold: v3.healingThreshold,

    // Checkpoints (unused in v3)
    triageCheckpointEnabled: false,

    // Planner (unused in v3)
    plannerProvider: v3.planProvider,
    plannerModel: v3.planModel,

    // Intent Refinement (handled differently in v3)
    intentRefinementEnabled: false,

    // Experimental
    experimentalAgentTeams: v3.experimentalAgentTeams,

    // v3-specific
    pipelineVersion: 3,
    reflectProvider: v3.reflectProvider,
    reflectModel: v3.reflectModel,
    brainQuestionsEnabled: v3.brainQuestionsEnabled,
  };
}
