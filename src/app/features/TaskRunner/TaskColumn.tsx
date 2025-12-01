'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Square, Trash2, XCircle } from 'lucide-react';
import TaskItem from './TaskItem';
import type { ProjectRequirement } from './lib/types';

interface TaskColumnProps {
  projectId: string;
  projectName: string;
  requirements: ProjectRequirement[];
  selectedRequirements: Set<string>;
  onToggleSelect: (reqId: string) => void;
  onDelete: (reqId: string) => void;
  onBulkDelete?: (reqIds: string[]) => void;
  onToggleProjectSelection: (projectId: string) => void;
  getRequirementId: (req: ProjectRequirement) => string;
}

const TaskColumn = React.memo(function TaskColumn({
  projectId,
  projectName,
  requirements,
  selectedRequirements,
  onToggleSelect,
  onDelete,
  onBulkDelete,
  onToggleProjectSelection,
  getRequirementId,
}: TaskColumnProps) {
  // Calculate selection state
  const selectableRequirements = requirements.filter(
    (req) => req.status !== 'running' && req.status !== 'queued'
  );
  const selectedCount = selectableRequirements.filter((req) =>
    selectedRequirements.has(getRequirementId(req))
  ).length;
  const allSelected = selectableRequirements.length > 0 && selectedCount === selectableRequirements.length;
  const someSelected = selectedCount > 0 && !allSelected;

  // Sort requirements by status
  const sortedRequirements = React.useMemo(() => {
    return [...requirements].sort((a, b) => {
      const statusOrder = { idle: 0, queued: 1, running: 2, failed: 3, 'session-limit': 4, completed: 5 };
      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });
  }, [requirements]);

  // Calculate clearable (completed/failed) count
  const clearableRequirements = requirements.filter(
    (r) => r.status === 'completed' || r.status === 'failed' || r.status === 'session-limit'
  );
  const clearableCount = clearableRequirements.length;

  // Get selected requirements in this column
  const selectedInColumn = requirements.filter((r) =>
    selectedRequirements.has(getRequirementId(r))
  );

  const handleBulkDeleteSelected = () => {
    if (selectedInColumn.length > 0 && onBulkDelete) {
      const selectedIds = selectedInColumn.map((r) => getRequirementId(r));
      onBulkDelete(selectedIds);
    }
  };

  const handleClearCompleted = () => {
    if (clearableCount > 0 && onBulkDelete) {
      const clearableIds = clearableRequirements.map((r) => getRequirementId(r));
      onBulkDelete(clearableIds);
    }
  };

  const handleProjectSelectionToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleProjectSelection(projectId);
  };

  return (
    <motion.div
      className="flex flex-col bg-gray-900/40 border border-gray-700/40 rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-testid={`task-column-${projectId}`}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-gray-800/60 border-b border-gray-700/40">
        <div className="flex items-center justify-between gap-2">
          {/* Project name and selection toggle */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={handleProjectSelectionToggle}
              className="flex-shrink-0 text-gray-400 hover:text-emerald-400 transition-colors"
              title={allSelected ? 'Deselect all' : 'Select all'}
              disabled={selectableRequirements.length === 0}
              data-testid={`select-all-btn-${projectId}`}
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-emerald-400" />
              ) : someSelected ? (
                <Square className="w-4 h-4 text-emerald-400/60" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <h3 className="text-sm font-semibold text-gray-300 truncate" title={projectName}>
              {projectName}
            </h3>
          </div>

          {/* Action buttons and count badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Delete selected button */}
            {selectedInColumn.length > 0 && onBulkDelete && (
              <button
                onClick={handleBulkDeleteSelected}
                className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                title={`Delete ${selectedInColumn.length} selected`}
                data-testid={`bulk-delete-selected-btn-${projectId}`}
              >
                <Trash2 className="w-3 h-3" />
                <span>{selectedInColumn.length}</span>
              </button>
            )}

            {/* Clear completed/failed button */}
            {clearableCount > 0 && onBulkDelete && (
              <button
                onClick={handleClearCompleted}
                className="text-gray-400 hover:text-gray-300 text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-500/10 hover:bg-gray-500/20 transition-colors"
                title="Clear completed and failed tasks"
                data-testid={`clear-completed-btn-${projectId}`}
              >
                <XCircle className="w-3 h-3" />
                <span>{clearableCount}</span>
              </button>
            )}

            {selectedCount > 0 && (
              <span className="text-[10px] text-emerald-400 font-mono">
                {selectedCount}/{selectableRequirements.length}
              </span>
            )}
            <span className="text-[10px] text-gray-500 font-mono">
              {requirements.length}
            </span>
          </div>
        </div>
      </div>

      {/* Requirements List */}
      <div className="flex-1 px-2 py-2 space-y-1 min-h-[100px] max-h-[500px] overflow-y-auto custom-scrollbar">
        {sortedRequirements.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[10px] text-gray-600">
            No requirements
          </div>
        ) : (
          sortedRequirements.map((req) => {
            const reqId = getRequirementId(req);
            return (
              <TaskItem
                key={reqId}
                requirement={req}
                isSelected={selectedRequirements.has(reqId)}
                onToggleSelect={() => onToggleSelect(reqId)}
                onDelete={() => onDelete(reqId)}
                projectPath={req.projectPath}
              />
            );
          })
        )}
      </div>
    </motion.div>
  );
});

export default TaskColumn;
