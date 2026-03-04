/**
 * Conductor Pipeline Types
 *
 * Core type definitions for the autonomous development pipeline.
 * The Conductor orchestrates: Scout → Triage → Batch → Execute → Review
 * with a self-healing mechanism that learns from failures.
 */

import type { CLIProvider } from '@/lib/claude-terminal/types';
import type { ScanType } from '@/app/features/Ideas/lib/scanTypes';

// ============================================================================
// Pipeline Core
// ============================================================================

export type PipelineStage = 'scout' | 'triage' | 'batch' | 'execute' | 'review';

export type PipelineStatus = 'idle' | 'running' | 'paused' | 'stopping' | 'completed' | 'failed' | 'interrupted';

export const PIPELINE_STAGES: PipelineStage[] = ['scout', 'triage', 'batch', 'execute', 'review'];

export interface StageState {
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  startedAt?: string;
  completedAt?: string;
  itemsIn: number;
  itemsOut: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface PipelineMetrics {
  ideasGenerated: number;
  ideasAccepted: number;
  ideasRejected: number;
  tasksCreated: number;
  tasksCompleted: number;
  tasksFailed: number;
  healingPatchesApplied: number;
  totalDurationMs: number;
  estimatedCost: number;
}

export interface PipelineRun {
  id: string;
  projectId: string;
  status: PipelineStatus;
  currentStage: PipelineStage;
  cycle: number;
  config: BalancingConfig;
  stages: Record<PipelineStage, StageState>;
  startedAt: string;
  completedAt?: string;
  metrics: PipelineMetrics;
}

export interface PipelineRunSummary {
  id: string;
  projectId: string;
  status: PipelineStatus;
  cycles: number;
  metrics: PipelineMetrics;
  startedAt: string;
  completedAt?: string;
}

// ============================================================================
// Balancing Configuration
// ============================================================================

export type ScanStrategy = 'rotate' | 'weighted' | 'brain-driven';
export type ContextStrategy = 'all' | 'brain-driven' | 'selected';
export type BatchStrategy = 'sequential' | 'parallel' | 'dag';

export interface ModelRoutingRule {
  condition: 'complexity_1' | 'complexity_2' | 'complexity_3' | 'default';
  provider: CLIProvider;
  model: string;
}

export interface QuotaLimits {
  maxApiCallsPerHour: number;
  maxTokensPerRun: number;
  enabled: boolean;
}

export interface BalancingConfig {
  // Scout
  scanTypes: ScanType[];
  scanStrategy: ScanStrategy;
  contextStrategy: ContextStrategy;
  contextIds: string[];
  maxIdeasPerCycle: number;
  scanProvider: CLIProvider;
  scanModel: string | null;

  // Triage
  autoTriageThreshold: number;
  minImpact: number;
  maxEffort: number;
  maxRisk: number;
  triageProvider: CLIProvider;
  triageModel: string | null;

  // Batch
  maxBatchSize: number;
  batchStrategy: BatchStrategy;
  maxConcurrentTasks: number;

  // Execute
  executionProvider: CLIProvider;
  executionModel: string | null;
  executionTimeoutMs: number;
  modelRouting: ModelRoutingRule[];

  // Budget
  maxCyclesPerRun: number;
  quotaLimits: QuotaLimits;

  // Self-healing
  healingEnabled: boolean;
  healingThreshold: number;
}

export const DEFAULT_BALANCING_CONFIG: BalancingConfig = {
  // Scout defaults
  scanTypes: ['zen_architect', 'bug_hunter', 'code_refactor', 'ui_perfectionist', 'perf_optimizer'],
  scanStrategy: 'brain-driven',
  contextStrategy: 'all',
  contextIds: [],
  maxIdeasPerCycle: 10,
  scanProvider: 'claude',
  scanModel: null,

  // Triage defaults
  autoTriageThreshold: 0.7,
  minImpact: 5,
  maxEffort: 7,
  maxRisk: 6,
  triageProvider: 'claude',
  triageModel: null,

  // Batch defaults
  maxBatchSize: 5,
  batchStrategy: 'dag',
  maxConcurrentTasks: 2,

  // Execute defaults
  executionProvider: 'claude',
  executionModel: null,
  executionTimeoutMs: 6000 * 1000, // 6000s = 100min per task
  modelRouting: [
    { condition: 'complexity_1', provider: 'claude', model: 'sonnet' },
    { condition: 'complexity_2', provider: 'claude', model: 'opus' },
    { condition: 'complexity_3', provider: 'claude', model: 'opus' },
    { condition: 'default', provider: 'claude', model: 'sonnet' },
  ],

  // Budget defaults
  maxCyclesPerRun: 3,
  quotaLimits: {
    maxApiCallsPerHour: 100,
    maxTokensPerRun: 500000,
    enabled: false,
  },

  // Self-healing defaults
  healingEnabled: true,
  healingThreshold: 3,
};

// ============================================================================
// Self-Healing
// ============================================================================

export type ErrorType =
  | 'prompt_ambiguity'
  | 'missing_context'
  | 'tool_failure'
  | 'timeout'
  | 'permission_error'
  | 'dependency_missing'
  | 'invalid_output'
  | 'unknown';

export type HealingTargetType = 'prompt' | 'config' | 'scan_weight';

export interface ErrorClassification {
  id: string;
  pipelineRunId: string;
  stage: PipelineStage;
  errorType: ErrorType;
  errorMessage: string;
  taskId?: string;
  scanType?: string;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
}

export interface HealingPatch {
  id: string;
  pipelineRunId: string;
  targetType: HealingTargetType;
  targetId: string;
  originalValue: string;
  patchedValue: string;
  reason: string;
  errorPattern: string;
  appliedAt: string;
  effectiveness?: number;
  reverted: boolean;
}

// ============================================================================
// Stage I/O Types
// ============================================================================

export interface ScoutResult {
  scanType: ScanType;
  contextId?: string;
  contextName?: string;
  scanId?: string;
  ideasGenerated: number;
  ideaIds: string[];
}

export interface TriageResult {
  acceptedIds: string[];
  rejectedIds: string[];
  skippedIds: string[];
}

export interface BatchDescriptor {
  id: string;
  requirementNames: string[];
  modelAssignments: Record<string, { provider: CLIProvider; model: string }>;
  dagDependencies: Record<string, string[]>;
}

export interface ExecutionTaskState {
  requirementName: string;
  provider: CLIProvider;
  model: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted';
  executionId?: string;
  startedAt?: string;
  durationMs?: number;
  error?: string;
}

export interface ExecutionResult {
  taskId: string;
  requirementName: string;
  success: boolean;
  error?: string;
  filesChanged?: string[];
  durationMs?: number;
}

export interface ReviewDecision {
  shouldContinue: boolean;
  reason: string;
  successRate: number;
  healingTriggered: boolean;
}

// ============================================================================
// Process Log
// ============================================================================

export type ProcessLogEvent = 'started' | 'completed' | 'failed' | 'skipped' | 'info';

export interface ProcessLogEntry {
  id: string;
  timestamp: string;
  stage: PipelineStage;
  event: ProcessLogEvent;
  message: string;
  itemsIn?: number;
  itemsOut?: number;
  error?: string;
  durationMs?: number;
  cycle?: number;
}

// ============================================================================
// Stage Metadata (for UI)
// ============================================================================

export interface StageConfig {
  id: PipelineStage;
  label: string;
  description: string;
  icon: string;
  activeColor: string;
  completedColor: string;
}

export const STAGE_CONFIGS: StageConfig[] = [
  {
    id: 'scout',
    label: 'Scout',
    description: 'Generate ideas by scanning codebase',
    icon: 'Search',
    activeColor: 'cyan',
    completedColor: 'emerald',
  },
  {
    id: 'triage',
    label: 'Triage',
    description: 'Evaluate and prioritize ideas',
    icon: 'Filter',
    activeColor: 'amber',
    completedColor: 'emerald',
  },
  {
    id: 'batch',
    label: 'Batch',
    description: 'Group tasks and plan execution',
    icon: 'Layers',
    activeColor: 'purple',
    completedColor: 'emerald',
  },
  {
    id: 'execute',
    label: 'Execute',
    description: 'Run CLI tasks with model routing',
    icon: 'Zap',
    activeColor: 'orange',
    completedColor: 'emerald',
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Analyze results and heal errors',
    icon: 'CheckCircle',
    activeColor: 'pink',
    completedColor: 'emerald',
  },
];

// ============================================================================
// Helpers
// ============================================================================

export function createEmptyStages(): Record<PipelineStage, StageState> {
  return {
    scout: { status: 'pending', itemsIn: 0, itemsOut: 0 },
    triage: { status: 'pending', itemsIn: 0, itemsOut: 0 },
    batch: { status: 'pending', itemsIn: 0, itemsOut: 0 },
    execute: { status: 'pending', itemsIn: 0, itemsOut: 0 },
    review: { status: 'pending', itemsIn: 0, itemsOut: 0 },
  };
}

export function createEmptyMetrics(): PipelineMetrics {
  return {
    ideasGenerated: 0,
    ideasAccepted: 0,
    ideasRejected: 0,
    tasksCreated: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    healingPatchesApplied: 0,
    totalDurationMs: 0,
    estimatedCost: 0,
  };
}
