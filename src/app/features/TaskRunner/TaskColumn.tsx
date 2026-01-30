'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import TaskColumnHeader from './components/TaskColumnHeader';
import TaskGroupedList from './components/TaskGroupedList';
import { useTaskColumnData, type ContextInfo } from './hooks/useTaskColumnData';
import { groupRequirementsByContext, calculateSelectionStats } from './lib/taskColumnUtils';
import type { ProjectRequirement } from './lib/types';
import type { AggregationCheckResult } from './lib/ideaAggregator';
import type { DbIdea } from '@/app/db';

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
}: TaskColumnProps) {
  const [isAggregating, setIsAggregating] = useState(false);

  const { aggregationCheck, ideasMap, contextsMap, checkAggregation } = useTaskColumnData({
    projectId,
    projectPath,
    requirements,
    aggregationData,
    ideasData,
    contextsData,
  });

  // Group requirements by context
  const groupedRequirements = useMemo(
    () => groupRequirementsByContext(requirements, ideasMap, contextsMap),
    [requirements, ideasMap, contextsMap]
  );

  // Calculate selection statistics
  const stats = useMemo(
    () => calculateSelectionStats(requirements, selectedRequirements, getRequirementId),
    [requirements, selectedRequirements, getRequirementId]
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

  const handleProjectSelectionToggle = useCallback(() => {
    onToggleProjectSelection(projectId);
  }, [onToggleProjectSelection, projectId]);

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
        requirementsCount={requirements.length}
        aggregationCheck={aggregationCheck}
        isAggregating={isAggregating}
        onToggleProjectSelection={handleProjectSelectionToggle}
        onAggregate={handleAggregate}
        onBulkDeleteSelected={handleBulkDeleteSelected}
        onClearCompleted={handleClearCompleted}
        onResetAllFailed={handleResetAllFailed}
        canBulkDelete={!!onBulkDelete}
        canReset={!!onReset}
      />

      <div className="flex-1 px-2 py-2 min-h-[100px] max-h-[500px] overflow-y-auto custom-scrollbar">
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
