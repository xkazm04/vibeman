/**
 * Blueprint Execution Store
 *
 * Manages the execution state of Blueprint pipelines using composable slices.
 * Split into focused sub-stores for better maintainability:
 * - executionSlice: Current execution state and stages
 * - decisionSlice: Decision requests and resolution
 * - historySlice: Execution history
 * - settingsSlice: User preferences
 *
 * Supports:
 * - Pause/resume on user decisions
 * - Background execution while user is elsewhere
 * - Integration with GlobalTaskBar for status display
 * - Toast notifications for decision prompts
 *
 * @example
 * ```typescript
 * import { useBlueprintExecutionStore } from '@/stores/blueprintExecutionStore';
 *
 * const { startExecution, requestDecision, resumeExecution, abortExecution } = useBlueprintExecutionStore();
 *
 * // Start execution
 * await startExecution({
 *   blueprintId: 'my-blueprint',
 *   blueprintName: 'Code Quality Scan',
 *   projectId: 'proj-123',
 *   projectPath: '/path/to/project',
 *   stages: [{ id: 'stage-1', name: 'Analyze', type: 'analyzer' }],
 * });
 * ```
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  createExecutionSlice,
  createDecisionSlice,
  createHistorySlice,
  createSettingsSlice,
} from './slices/blueprintExecution';

import type {
  BlueprintExecutionState,
  TechnicalSummary,
  BusinessSummary,
} from './slices/blueprintExecution/types';

// Re-export types for backward compatibility
export type {
  ExecutionStatus,
  DecisionType,
  TechnicalSummary,
  BusinessSummary,
  DecisionRequest,
  ExecutionStage,
  BlueprintExecution,
} from './slices/blueprintExecution/types';

export const useBlueprintExecutionStore = create<BlueprintExecutionState>()(
  persist(
    (set, get, api) => ({
      // Compose all slices
      ...createExecutionSlice(set, get, api),
      ...createDecisionSlice(set, get, api),
      ...createHistorySlice(set, get, api),
      ...createSettingsSlice(set, get, api),
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
