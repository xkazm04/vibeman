import { useState, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTaskColumnData, type ContextInfo } from './useTaskColumnData';
import { groupRequirementsByContext, calculateSelectionStats } from '../lib/taskColumnUtils';
import type { ProjectRequirement } from '../lib/types';
import { useTaskRunnerStore } from '../store/taskRunnerStore';
import type { AggregationCheckResult } from '../lib/ideaAggregator';
import type { DbIdea } from '@/app/db';

export interface UseTaskColumnOrchestrationProps {
  projectId: string;
  projectPath: string;
  requirements: ProjectRequirement[];
  selectedRequirements: Set<string>;
  onToggleSelect: (reqId: string) => void;
  onDelete: (reqId: string) => void;
  onReset?: (reqId: string) => void;
  onBulkDelete?: (reqIds: string[]) => void;
  onToggleProjectSelection: (projectId: string) => void;
  onToggleContextSelection?: (projectId: string, contextKey: string, ideasMap: Record<string, DbIdea | null>) => void;
  getRequirementId: (req: ProjectRequirement) => string;
  onRefresh?: () => void;
  aggregationData?: AggregationCheckResult | null;
  ideasData?: Record<string, DbIdea | null>;
  contextsData?: Record<string, ContextInfo>;
  onAutoAssign?: (requirements: ProjectRequirement[], ideasMap: Record<string, DbIdea | null>) => void;
}

export function useTaskColumnOrchestration({
  projectId,
  projectPath,
  requirements,
  selectedRequirements,
  onReset,
  onBulkDelete,
  onToggleProjectSelection,
  onToggleContextSelection,
  getRequirementId,
  onRefresh,
  aggregationData,
  ideasData,
  contextsData,
  onAutoAssign,
}: UseTaskColumnOrchestrationProps) {
  const [isAggregating, setIsAggregating] = useState(false);

  // Project-scoped store subscription: only re-renders when THIS project's tasks change
  const projectPrefix = `${projectId}:`;
  const projectTasks = useTaskRunnerStore(
    useShallow((state) => {
      const filtered: Record<string, typeof state.tasks[string]> = {};
      for (const key in state.tasks) {
        if (key.startsWith(projectPrefix)) {
          filtered[key] = state.tasks[key];
        }
      }
      return filtered;
    })
  );

  // Merge requirements with project-scoped task status
  const requirementsWithStatus = useMemo((): ProjectRequirement[] => {
    return requirements.map((req) => {
      const reqId = getRequirementId(req);
      const task = projectTasks[reqId];
      if (task) {
        return { ...req, status: task.status };
      }
      return req;
    });
  }, [requirements, projectTasks, getRequirementId]);

  const { aggregationCheck, ideasMap, contextsMap, checkAggregation } = useTaskColumnData({
    projectId,
    projectPath,
    requirements: requirementsWithStatus,
    aggregationData,
    ideasData,
    contextsData,
  });

  // Group requirements by context
  const groupedRequirements = useMemo(
    () => groupRequirementsByContext(requirementsWithStatus, ideasMap, contextsMap),
    [requirementsWithStatus, ideasMap, contextsMap]
  );

  // Calculate selection statistics
  const stats = useMemo(
    () => calculateSelectionStats(requirementsWithStatus, selectedRequirements, getRequirementId),
    [requirementsWithStatus, selectedRequirements, getRequirementId]
  );

  // Auto-assign: selected idle requirements
  const selectedIdleRequirements = useMemo(() => {
    return requirementsWithStatus.filter((req) => {
      const reqId = getRequirementId(req);
      const isSelected = selectedRequirements.has(reqId);
      const isIdle = !req.status || req.status.type === 'idle';
      return isSelected && isIdle;
    });
  }, [requirementsWithStatus, selectedRequirements, getRequirementId]);

  const handleAggregate = useCallback(async () => {
    if (!projectPath || isAggregating) return;

    setIsAggregating(true);
    try {
      const response = await fetch('/api/idea-aggregator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      });

      const data = await response.json();
      if (data.success) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await onRefresh?.();
        await checkAggregation();
      } else {
        console.error('Aggregation failed:', data.error, data.errors);
      }
    } catch (error) {
      console.error('Failed to aggregate:', error);
    } finally {
      setIsAggregating(false);
    }
  }, [projectPath, isAggregating, onRefresh, checkAggregation]);

  const handleBulkDeleteSelected = useCallback(() => {
    if (stats.selectedInColumn.length > 0 && onBulkDelete) {
      const selectedIds = stats.selectedInColumn.map((r) => getRequirementId(r));
      onBulkDelete(selectedIds);
    }
  }, [stats.selectedInColumn, onBulkDelete, getRequirementId]);

  const handleClearCompleted = useCallback(() => {
    if (stats.clearableCount > 0 && onBulkDelete) {
      const clearableIds = stats.clearableRequirements.map((r) => getRequirementId(r));
      onBulkDelete(clearableIds);
    }
  }, [stats.clearableCount, stats.clearableRequirements, onBulkDelete, getRequirementId]);

  const handleResetAllFailed = useCallback(() => {
    if (stats.failedCount > 0 && onReset) {
      stats.failedRequirements.forEach((r) => {
        onReset(getRequirementId(r));
      });
    }
  }, [stats.failedCount, stats.failedRequirements, onReset, getRequirementId]);

  const handleResetAllQueued = useCallback(() => {
    if (stats.queuedCount > 0 && onReset) {
      stats.queuedRequirements.forEach((r) => {
        onReset(getRequirementId(r));
      });
    }
  }, [stats.queuedCount, stats.queuedRequirements, onReset, getRequirementId]);

  const handleProjectSelectionToggle = useCallback(() => {
    onToggleProjectSelection(projectId);
  }, [onToggleProjectSelection, projectId]);

  const handleContextSelectionToggle = useCallback(
    (contextKey: string) => {
      onToggleContextSelection?.(projectId, contextKey, ideasMap);
    },
    [onToggleContextSelection, projectId, ideasMap]
  );

  const handleAutoAssign = useCallback(() => {
    if (onAutoAssign && selectedIdleRequirements.length > 0) {
      onAutoAssign(selectedIdleRequirements, ideasMap);
    }
  }, [onAutoAssign, selectedIdleRequirements, ideasMap]);

  return {
    isAggregating,
    aggregationCheck,
    ideasMap,
    groupedRequirements,
    stats,
    selectedIdleRequirements,
    handleAggregate,
    handleBulkDeleteSelected,
    handleClearCompleted,
    handleResetAllFailed,
    handleResetAllQueued,
    handleProjectSelectionToggle,
    handleContextSelectionToggle,
    handleAutoAssign,
  };
}
