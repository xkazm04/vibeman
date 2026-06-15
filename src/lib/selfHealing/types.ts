/**
 * Self-Healing Types
 *
 * Error classification + healing-patch types used by the Claude Code execution
 * queue's error-recovery path. Extracted from the (removed) Conductor module so
 * the shared classifier survives independently.
 */

export type ErrorType =
  | 'prompt_ambiguity'
  | 'missing_context'
  | 'rate_limit'
  | 'tool_failure'
  | 'timeout'
  | 'permission_error'
  | 'dependency_missing'
  | 'invalid_output'
  | 'unknown';

export type HealingTargetType = 'prompt' | 'config' | 'scan_weight';

export type PipelineStage = 'scout' | 'triage' | 'batch' | 'execute' | 'review';

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
  expiresAt?: string;
  applicationCount?: number;
  successCount?: number;
}
