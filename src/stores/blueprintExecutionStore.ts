/**
 * Blueprint Execution Store
 *
 * Manages the execution state of Blueprint pipelines with support for:
 * - Pause/resume on user decisions
 * - Background execution while user is elsewhere
 * - Integration with GlobalTaskBar for status display
 * - Toast notifications for decision prompts
 *
 * @example
 * ```typescript
 * import { useBlueprintExecutionStore } from '@/stores/blueprintExecutionStore';
 *
 * // Start a blueprint execution
 * const { startExecution, requestDecision, resumeExecution, abortExecution } = useBlueprintExecutionStore();
 *
 * // Start execution
 * await startExecution({
 *   blueprintId: 'my-blueprint',
 *   blueprintName: 'Code Quality Scan',
 *   projectId: 'proj-123',
 * });
 *
 * // Request user decision (pauses execution)
 * await requestDecision({
 *   title: 'Review Scan Results',
 *   summary: { filesScanned: 150, issuesFound: 23 },
 *   type: 'pre-execution',
 * });
 *
 * // User accepts -> resumeExecution()
 * // User rejects -> abortExecution()
 * ```
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

/**
 * Execution status
 */
export type ExecutionStatus =
  | 'idle'
  | 'running'
  | 'paused-for-decision'
  | 'completed'
  | 'failed'
  | 'aborted';

/**
 * Decision type for different stages
 */
export type DecisionType =
  | 'pre-analyzer'      // Before analyzers run (scope preview)
  | 'post-analyzer'     // After analysis (issue review)
  | 'pre-execution'     // Before executor runs (final confirmation)
  | 'custom';           // Custom decision point

/**
 * Summary data for technical analyzers
 */
export interface TechnicalSummary {
  filesScanned: number;
  foldersScanned: number;
  issuesFound?: number;
  issuesByCategory?: Record<string, number>;
  estimatedTime?: number;
}

/**
 * Summary data for business analyzers
 */
export interface BusinessSummary {
  promptPreview: string;
  contextName?: string;
  contextDescription?: string;
  estimatedTokens?: number;
}

/**
 * Decision request data
 */
export interface DecisionRequest {
  id: string;
  type: DecisionType;
  title: string;
  description?: string;
  summary: TechnicalSummary | BusinessSummary;
  createdAt: number;
  expiresAt?: number;
}

/**
 * Stage in the pipeline execution
 */
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

/**
 * Blueprint execution state
 */
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

/**
 * Store state
 */
interface BlueprintExecutionState {
  // Current execution
  currentExecution: BlueprintExecution | null;

  // History of recent executions
  executionHistory: BlueprintExecution[];

  // Settings
  settings: {
    requireDecisionBeforeExecution: boolean;
    showToastNotifications: boolean;
    autoExpandGlobalTaskBar: boolean;
  };

  // Actions
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

  requestDecision: (request: Omit<DecisionRequest, 'id' | 'createdAt'>) => Promise<boolean>;

  resumeExecution: () => void;

  abortExecution: (reason?: string) => void;

  completeExecution: (result?: unknown) => void;

  failExecution: (error: string) => void;

  clearExecution: () => void;

  setSettings: (settings: Partial<BlueprintExecutionState['settings']>) => void;

  // Helpers
  isDecisionPending: () => boolean;
  getCurrentStage: () => ExecutionStage | null;
  getProgress: () => { completed: number; total: number; percentage: number };
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useBlueprintExecutionStore = create<BlueprintExecutionState>()(
  persist(
    (set, get) => ({
      currentExecution: null,
      executionHistory: [],
      settings: {
        requireDecisionBeforeExecution: true,
        showToastNotifications: true,
        autoExpandGlobalTaskBar: true,
      },

      startExecution: ({ blueprintId, blueprintName, projectId, projectPath, stages }) => {
        const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const execution: BlueprintExecution = {
          id: executionId,
          blueprintId,
          blueprintName,
          projectId,
          projectPath,
          status: 'running',
          stages: stages.map(s => ({
            ...s,
            status: 'pending' as const,
          })),
          currentStageIndex: 0,
          pendingDecision: null,
          startedAt: Date.now(),
        };

        set({ currentExecution: execution });

        return executionId;
      },

      updateStageStatus: (stageId, status, output, error) => {
        set(state => {
          if (!state.currentExecution) return state;

          const stages = state.currentExecution.stages.map(stage => {
            if (stage.id !== stageId) return stage;

            return {
              ...stage,
              status,
              output,
              error,
              startedAt: status === 'running' ? Date.now() : stage.startedAt,
              completedAt: ['completed', 'failed', 'skipped'].includes(status)
                ? Date.now()
                : stage.completedAt,
            };
          });

          // Update current stage index
          const currentIndex = stages.findIndex(s => s.status === 'running');
          const newIndex = currentIndex >= 0 ? currentIndex : state.currentExecution.currentStageIndex;

          return {
            currentExecution: {
              ...state.currentExecution,
              stages,
              currentStageIndex: newIndex,
            },
          };
        });
      },

      requestDecision: async (request) => {
        return new Promise((resolve) => {
          const decisionId = `decision-${Date.now()}`;

          const decisionRequest: DecisionRequest = {
            ...request,
            id: decisionId,
            createdAt: Date.now(),
          };

          set(state => {
            if (!state.currentExecution) {
              resolve(false);
              return state;
            }

            return {
              currentExecution: {
                ...state.currentExecution,
                status: 'paused-for-decision',
                pendingDecision: decisionRequest,
              },
            };
          });

          // Store the resolver so resume/abort can resolve the promise
          (window as any).__blueprintDecisionResolver = resolve;
        });
      },

      resumeExecution: () => {
        set(state => {
          if (!state.currentExecution) return state;

          return {
            currentExecution: {
              ...state.currentExecution,
              status: 'running',
              pendingDecision: null,
            },
          };
        });

        // Resolve the pending decision promise
        const resolver = (window as any).__blueprintDecisionResolver;
        if (resolver) {
          resolver(true);
          delete (window as any).__blueprintDecisionResolver;
        }
      },

      abortExecution: (reason) => {
        set(state => {
          if (!state.currentExecution) return state;

          const execution: BlueprintExecution = {
            ...state.currentExecution,
            status: 'aborted',
            pendingDecision: null,
            completedAt: Date.now(),
            error: reason || 'Aborted by user',
          };

          return {
            currentExecution: null,
            executionHistory: [execution, ...state.executionHistory].slice(0, 10),
          };
        });

        // Resolve the pending decision promise with false
        const resolver = (window as any).__blueprintDecisionResolver;
        if (resolver) {
          resolver(false);
          delete (window as any).__blueprintDecisionResolver;
        }
      },

      completeExecution: (result) => {
        set(state => {
          if (!state.currentExecution) return state;

          const execution: BlueprintExecution = {
            ...state.currentExecution,
            status: 'completed',
            completedAt: Date.now(),
            result,
          };

          return {
            currentExecution: null,
            executionHistory: [execution, ...state.executionHistory].slice(0, 10),
          };
        });
      },

      failExecution: (error) => {
        set(state => {
          if (!state.currentExecution) return state;

          const execution: BlueprintExecution = {
            ...state.currentExecution,
            status: 'failed',
            completedAt: Date.now(),
            error,
          };

          return {
            currentExecution: null,
            executionHistory: [execution, ...state.executionHistory].slice(0, 10),
          };
        });
      },

      clearExecution: () => {
        set({ currentExecution: null });
      },

      setSettings: (newSettings) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      isDecisionPending: () => {
        const { currentExecution } = get();
        return currentExecution?.status === 'paused-for-decision';
      },

      getCurrentStage: () => {
        const { currentExecution } = get();
        if (!currentExecution) return null;
        return currentExecution.stages[currentExecution.currentStageIndex] || null;
      },

      getProgress: () => {
        const { currentExecution } = get();
        if (!currentExecution) {
          return { completed: 0, total: 0, percentage: 0 };
        }

        const completed = currentExecution.stages.filter(
          s => s.status === 'completed' || s.status === 'skipped'
        ).length;
        const total = currentExecution.stages.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { completed, total, percentage };
      },
    }),
    {
      name: 'blueprint-execution-store',
      partialize: (state) => ({
        settings: state.settings,
        executionHistory: state.executionHistory,
      }),
    }
  )
);

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Hook to check if a decision is pending
 */
export function useIsDecisionPending(): boolean {
  return useBlueprintExecutionStore(state => state.currentExecution?.status === 'paused-for-decision');
}

/**
 * Hook to get current execution progress
 */
export function useBlueprintProgress() {
  return useBlueprintExecutionStore(state => state.getProgress());
}

/**
 * Hook to get pending decision
 */
export function usePendingDecision() {
  return useBlueprintExecutionStore(state => state.currentExecution?.pendingDecision);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format summary for display
 */
export function formatDecisionSummary(summary: TechnicalSummary | BusinessSummary): string {
  if ('filesScanned' in summary) {
    // Technical summary
    const lines: string[] = [];
    lines.push(`📁 ${summary.filesScanned} files scanned`);
    if (summary.issuesFound !== undefined) {
      lines.push(`⚠️ ${summary.issuesFound} issues found`);
    }
    if (summary.estimatedTime) {
      const seconds = Math.ceil(summary.estimatedTime / 1000);
      lines.push(`⏱️ Est. ${seconds}s remaining`);
    }
    return lines.join('\n');
  } else {
    // Business summary
    const lines: string[] = [];
    if (summary.contextName) {
      lines.push(`📋 Context: ${summary.contextName}`);
    }
    if (summary.promptPreview) {
      const preview = summary.promptPreview.slice(0, 100);
      lines.push(`💬 ${preview}${summary.promptPreview.length > 100 ? '...' : ''}`);
    }
    if (summary.estimatedTokens) {
      lines.push(`🔢 ~${summary.estimatedTokens} tokens`);
    }
    return lines.join('\n');
  }
}

/**
 * Check if summary is technical
 */
export function isTechnicalSummary(summary: TechnicalSummary | BusinessSummary): summary is TechnicalSummary {
  return 'filesScanned' in summary;
}
