'use client';

import React from 'react';
import { motion } from 'framer-motion';
import TaskColumnHeader from './components/TaskColumnHeader';
import TaskGroupedList from './components/TaskGroupedList';
import { useTaskColumnOrchestration, type UseTaskColumnOrchestrationProps } from './hooks/useTaskColumnOrchestration';
import type { ContextInfo } from './hooks/useTaskColumnData';

interface TaskColumnProps extends UseTaskColumnOrchestrationProps {
  projectName: string;
}

const TaskColumn = React.memo(function TaskColumn({ projectName, ...orchestrationProps }: TaskColumnProps) {
  const {
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
  } = useTaskColumnOrchestration(orchestrationProps);

  const { projectId, requirements, selectedRequirements, onToggleSelect, onDelete, onReset, onBulkDelete, onAutoAssign, getRequirementId } = orchestrationProps;

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
          onToggleContextSelection={handleContextSelectionToggle}
        />
      </div>
    </motion.div>
  );
});

export default TaskColumn;

// Re-export types for backward compatibility
export type { ContextInfo };
