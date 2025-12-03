/**
 * Pipeline Types
 * Type definitions for the Blueprint pipeline system
 */

/**
 * Pipeline execution mode
 */
export type PipelineExecutionMode = 'fire-and-forget' | 'polling';

/**
 * Pipeline step status
 */
export type PipelineStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

/**
 * Configuration for pipeline execution
 */
export interface PipelineConfig {
  projectPath: string;
  projectId: string;
  requirementName: string;
  requirementContent: string;
  executionMode: PipelineExecutionMode;
  maxPollingTime?: number;  // Default: 10 minutes (600000ms)
  pollInterval?: number;    // Default: 2 seconds (2000ms)
  onProgress?: (progress: number, message?: string) => void;
  onStepComplete?: (step: string, result: unknown) => void;
}

/**
 * Result from pipeline execution
 */
export interface PipelineResult {
  success: boolean;
  taskId?: string;
  requirementPath?: string;
  error?: string;
  completedAt?: string;
  duration?: number;
  steps?: PipelineStepResult[];
}

/**
 * Result from a single pipeline step
 */
export interface PipelineStepResult {
  name: string;
  status: PipelineStepStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  data?: unknown;
  error?: string;
}

/**
 * Pipeline task status from Claude Code
 */
export interface PipelineTaskStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  message?: string;
  error?: string;
  result?: unknown;
}

/**
 * Progress weights for pipeline steps
 */
export interface ProgressWeights {
  createRequirement: number;  // Default: 20
  executeAsync: number;       // Default: 10
  polling: number;            // Default: 70
}

/**
 * Default pipeline configuration values
 */
export const PIPELINE_DEFAULTS = {
  MAX_POLLING_TIME: 10 * 60 * 1000,  // 10 minutes
  POLL_INTERVAL: 2000,                // 2 seconds
  PROGRESS_WEIGHTS: {
    createRequirement: 20,
    executeAsync: 10,
    polling: 70,
  } as ProgressWeights,
} as const;
