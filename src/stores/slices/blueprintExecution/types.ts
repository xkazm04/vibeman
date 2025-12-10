/**
 * Shared types for blueprint execution store slices
 */

import { generateExecutionId } from '@/lib/idGenerator';

// ============================================================================
// Types
// ============================================================================

export type ExecutionStatus =
  | 'idle'
  | 'running'
  | 'paused-for-decision'
  | 'completed'
  | 'failed'
  | 'aborted';

export type DecisionType =
  | 'pre-analyzer'
  | 'post-analyzer'
  | 'pre-execution'
  | 'custom';

export interface TechnicalSummary {
  filesScanned: number;
  foldersScanned: number;
  issuesFound?: number;
  issuesByCategory?: Record<string, number>;
  estimatedTime?: number;
}

export interface BusinessSummary {
  promptPreview: string;
  contextName?: string;
  contextDescription?: string;
  estimatedTokens?: number;
}

export interface DecisionRequest {
  id: string;
  type: DecisionType;
  title: string;
  description?: string;
  summary: TechnicalSummary | BusinessSummary;
  createdAt: number;
  expiresAt?: number;
}

export interface ExecutionStage {
  id: string;
  name: string;
  type: 'analyzer' | 'processor' | 'executor';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  error?: string;
  output?: unknown;
}

export interface BlueprintExecution {
  id: string;
  blueprintId: string;
  blueprintName: string;
  projectId: string;
  projectPath: string;
  status: ExecutionStatus;
  stages: ExecutionStage[];
  currentStageIndex: number;
  pendingDecision: DecisionRequest | null;
  startedAt: number;
  completedAt?: number;
  error?: string;
  result?: unknown;
}

export interface ExecutionSettings {
  requireDecisionBeforeExecution: boolean;
  showToastNotifications: boolean;
  autoExpandGlobalTaskBar: boolean;
}

// ============================================================================
// SLICE STATE INTERFACES
// ============================================================================

export interface ExecutionSlice {
  currentExecution: BlueprintExecution | null;

  startExecution: (params: {
    blueprintId: string;
    blueprintName: string;
    projectId: string;
    projectPath: string;
    stages: Array<{ id: string; name: string; type: 'analyzer' | 'processor' | 'executor' }>;
  }) => string;

  updateStageStatus: (
    stageId: string,
    status: ExecutionStage['status'],
    output?: unknown,
    error?: string
  ) => void;

  completeExecution: (result?: unknown) => void;
  failExecution: (error: string) => void;
  clearExecution: () => void;

  getCurrentStage: () => ExecutionStage | null;
  getProgress: () => { completed: number; total: number; percentage: number };
}

export interface DecisionSlice {
  requestDecision: (request: Omit<DecisionRequest, 'id' | 'createdAt'>) => Promise<boolean>;
  resumeExecution: () => void;
  abortExecution: (reason?: string) => void;
  isDecisionPending: () => boolean;
}

export interface HistorySlice {
  executionHistory: BlueprintExecution[];
}

export interface SettingsSlice {
  settings: ExecutionSettings;
  setSettings: (settings: Partial<ExecutionSettings>) => void;
}

// Combined store type
export type BlueprintExecutionState = ExecutionSlice & DecisionSlice & HistorySlice & SettingsSlice;

// ============================================================================
// Helper for generating execution IDs
// ============================================================================

export { generateExecutionId };
