'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import TaskColumnHeader from './components/TaskColumnHeader';
import TaskGroupedList from './components/TaskGroupedList';
import { useTaskColumnData, type ContextInfo } from './hooks/useTaskColumnData';
import { groupRequirementsByContext, calculateSelectionStats } from './lib/taskColumnUtils';
import type { ProjectRequirement } from './lib/types';
import { useTaskRunnerStore } from './store/taskRunnerStore';
import type { AggregationCheckResult } from './lib/ideaAggregator';
import type { DbIdea } from '@/app/db';
import { fetchAutoAssignConfig } from '@/lib/autoAssignConfig';

interface TaskColumnProps {
  projectId: string;
  projectName: string;
  projectPath: string;
  requirements: ProjectRequirement[];
  selectedRequirements: Set<string>;
  onToggleSelect: (reqId: string) => void;
  onDelete: (reqId: string) => void;
  onReset?: (reqId: string) => void;
  onBulkDelete?: (reqIds: string[]) => void;
  onToggleProjectSelection: (projectId: string) => void;
  getRequirementId: (req: ProjectRequirement) => string;
  onRefresh?: () => void;
  aggregationData?: AggregationCheckResult | null;
  ideasData?: Record<string, DbIdea | null>;
  contextsData?: Record<string, ContextInfo>;
  onAutoAssign?: (requirements: ProjectRequirement[], ideasMap: Record<string, DbIdea | null>) => void;
}

const TaskColumn = React.memo(function TaskColumn({
  projectId,
  projectName,
  projectPath,
  requirements,
  selectedRequirements,
  onToggleSelect,
  onDelete,
  onReset,
  onBulkDelete,
  onToggleProjectSelection,
  getRequirementId,
  onRefresh,
  aggregationData,
  ideasData,
  contextsData,
  onAutoAssign,
}: TaskColumnProps) {
  const [isAggregating, setIsAggregating] = useState(false);
  const [pendingAutoAssign, setPendingAutoAssign] = useState(false);

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

  // Handle aggregation
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

  // Auto-assign: selected idle requirements
  const selectedIdleRequirements = useMemo(() => {
    return requirementsWithStatus.filter((req) => {
      const reqId = getRequirementId(req);
      const isSelected = selectedRequirements.has(reqId);
      const isIdle = !req.status || req.status.type === 'idle';
      return isSelected && isIdle;
    });
  }, [requirementsWithStatus, selectedRequirements, getRequirementId]);

  // After consolidation, fire auto-assign with fresh data once requirements re-render
  useEffect(() => {
    if (!pendingAutoAssign || !onAutoAssign) return;
    const timer = setTimeout(() => {
      setPendingAutoAssign(false);
      // Use ALL idle requirements (old selection IDs are invalid after aggregation)
      const allIdle = requirementsWithStatus.filter(
        (req) => !req.status || req.status.type === 'idle'
      );
      if (allIdle.length > 0) {
        onAutoAssign(allIdle, ideasMap);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [pendingAutoAssign, requirementsWithStatus, ideasMap, onAutoAssign]);

  const handleAutoAssign = useCallback(async () => {
    if (!onAutoAssign) return;

    const config = await fetchAutoAssignConfig();

    if (config.consolidateBeforeAssign && aggregationCheck?.canAggregate && projectPath) {
      // Phase 1: Consolidate first (reuses existing aggregation flow)
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
          setPendingAutoAssign(true); // Phase 2 handled by useEffect above
          return;
        }
      } catch (error) {
        console.error('Consolidation before auto-assign failed:', error);
      } finally {
        setIsAggregating(false);
      }
    }

    // Direct assignment (consolidation disabled or not possible)
    if (selectedIdleRequirements.length > 0) {
      onAutoAssign(selectedIdleRequirements, ideasMap);
    }
  }, [onAutoAssign, aggregationCheck, projectPath, selectedIdleRequirements,
      ideasMap, onRefresh, checkAggregation]);

  return (
    <motion.div
      className="flex flex-col bg-gray-900/40 border border-gray-700/40 rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-testid={`task-column-${projectId}`}
    >
      <TaskColumnHeader
        projectId={projectId}
        projectName={projectName}
        allSelected={stats.allSelected}
        someSelected={stats.someSelected}
        selectedCount={stats.selectedCount}
        selectableCount={stats.selectableRequirements.length}
        selectedInColumnCount={stats.selectedInColumn.length}
        clearableCount={stats.clearableCount}
        failedCount={stats.failedCount}
        queuedCount={stats.queuedCount}
        requirementsCount={requirements.length}
        aggregationCheck={aggregationCheck}
        isAggregating={isAggregating}
        onToggleProjectSelection={handleProjectSelectionToggle}
        onAggregate={handleAggregate}
        onBulkDeleteSelected={handleBulkDeleteSelected}
        onClearCompleted={handleClearCompleted}
        onResetAllFailed={handleResetAllFailed}
        onResetAllQueued={handleResetAllQueued}
        canBulkDelete={!!onBulkDelete}
        canReset={!!onReset}
        onAutoAssign={onAutoAssign ? handleAutoAssign : undefined}
        autoAssignCount={selectedIdleRequirements.length}
      />

      <div className="flex-1 px-2 py-2 min-h-[100px] max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">
        <TaskGroupedList
          groupedRequirements={groupedRequirements}
          selectedRequirements={selectedRequirements}
          ideasMap={ideasMap}
          projectId={projectId}
          getRequirementId={getRequirementId}
          onToggleSelect={onToggleSelect}
          onDelete={onDelete}
          onReset={onReset}
        />
      </div>
    </motion.div>
  );
});

export default TaskColumn;

// Re-export types for backward compatibility
export type { ContextInfo };
