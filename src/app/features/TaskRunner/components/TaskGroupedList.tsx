'use client';

import React, { useCallback } from 'react';
import { Square, CheckSquare } from 'lucide-react';
import TaskItem from '../TaskItem';
import { TruncateTooltip } from '@/components/ui/TruncateTooltip';
import type { ProjectRequirement } from '../lib/types';
import type { DbIdea } from '@/app/db';
import type { ContextInfo } from '../hooks/useTaskColumnData';

interface GroupedRequirement {
  key: string;
  context: ContextInfo | null;
  requirements: ProjectRequirement[];
}

interface TaskGroupedListProps {
  groupedRequirements: GroupedRequirement[];
  selectedRequirements: Set<string>;
  ideasMap: Record<string, DbIdea | null>;
  projectId: string;
  getRequirementId: (req: ProjectRequirement) => string;
  onToggleSelect: (reqId: string) => void;
  onDelete: (reqId: string) => void;
  onReset?: (reqId: string) => void;
  onToggleContextSelection?: (contextKey: string) => void;
}

export default function TaskGroupedList({
  groupedRequirements,
  selectedRequirements,
  ideasMap,
  projectId,
  getRequirementId,
  onToggleSelect,
  onDelete,
  onReset,
  onToggleContextSelection,
}: TaskGroupedListProps) {
  // Stable callbacks that pass reqId — avoids creating new closures per item in the map loop
  const handleToggleSelect = useCallback((reqId: string) => onToggleSelect(reqId), [onToggleSelect]);
  const handleDelete = useCallback((reqId: string) => onDelete(reqId), [onDelete]);
  const handleReset = useCallback((reqId: string) => onReset?.(reqId), [onReset]);
  if (groupedRequirements.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-2xs text-gray-600">
        No requirements
      </div>
    );
  }

  return (
    <>
      {groupedRequirements.map((group) => {
        // Compute context-group selection state
        const selectableInGroup = group.requirements.filter(
          (req) => req.status.type !== 'running' && req.status.type !== 'queued'
        );
        const selectedInGroup = selectableInGroup.filter((req) =>
          selectedRequirements.has(getRequirementId(req))
        );
        const allGroupSelected = selectableInGroup.length > 0 && selectedInGroup.length === selectableInGroup.length;
        const someGroupSelected = selectedInGroup.length > 0 && !allGroupSelected;

        return (
        <div key={group.key} className="mb-3 last:mb-0">
          {/* Context Divider */}
          <div className="flex items-center gap-2 py-1 px-1 mb-1">
            {onToggleContextSelection && selectableInGroup.length > 0 && (
              <button
                onClick={() => onToggleContextSelection(group.key)}
                className="flex-shrink-0 hover:opacity-80 transition-opacity"
                title={allGroupSelected ? 'Deselect all in context' : 'Select all in context'}
              >
                {allGroupSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                ) : someGroupSelected ? (
                  <Square className="w-3.5 h-3.5 text-emerald-400/60" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-gray-500" />
                )}
              </button>
            )}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: group.context?.color || '#4b5563' }}
            />
            <TruncateTooltip
              text={
                group.context
                  ? group.context.groupName
                    ? `${group.context.groupName} - ${group.context.name}`
                    : group.context.name
                  : 'Without Context'
              }
            >
              <span
                className="text-2xs font-medium truncate block"
                style={{ color: group.context?.color || '#9ca3af' }}
              >
                {group.context
                  ? group.context.groupName
                    ? `${group.context.groupName} - ${group.context.name}`
                    : group.context.name
                  : 'Without Context'}
              </span>
            </TruncateTooltip>
            <div className="flex-1 h-px bg-gray-700/40" />
            <span className="text-micro text-gray-500 font-mono">{group.requirements.length}</span>
          </div>

          {/* Tasks in this group */}
          <div
            className="space-y-1 pl-2 ml-1 border-l-2"
            style={{ borderLeftColor: group.context?.color ? `${group.context.color}60` : 'rgba(75, 85, 99, 0.4)' }}
          >
            {group.requirements.map((req) => {
              const reqId = getRequirementId(req);
              return (
                <TaskItemWithStableCallbacks
                  key={reqId}
                  requirement={req}
                  reqId={reqId}
                  isSelected={selectedRequirements.has(reqId)}
                  onToggleSelect={handleToggleSelect}
                  onDelete={handleDelete}
                  onReset={onReset ? handleReset : undefined}
                  projectPath={req.projectPath}
                  projectId={projectId}
                  idea={ideasMap[req.requirementName]}
                />
              );
            })}
          </div>
        </div>
        );
      })}
    </>
  );
}

// Wrapper that binds reqId to stable parent callbacks so TaskItem (React.memo) gets stable refs
const TaskItemWithStableCallbacks = React.memo(function TaskItemWithStableCallbacks({
  requirement,
  reqId,
  isSelected,
  onToggleSelect,
  onDelete,
  onReset,
  projectPath,
  projectId,
  idea,
}: {
  requirement: ProjectRequirement;
  reqId: string;
  isSelected: boolean;
  onToggleSelect: (reqId: string) => void;
  onDelete: (reqId: string) => void;
  onReset?: (reqId: string) => void;
  projectPath: string;
  projectId: string;
  idea?: DbIdea | null;
}) {
  const handleToggle = useCallback(() => onToggleSelect(reqId), [onToggleSelect, reqId]);
  const handleDel = useCallback(() => onDelete(reqId), [onDelete, reqId]);
  const handleRes = useCallback(() => onReset?.(reqId), [onReset, reqId]);

  return (
    <TaskItem
      requirement={requirement}
      requirementId={reqId}
      isSelected={isSelected}
      onToggleSelect={handleToggle}
      onDelete={handleDel}
      onReset={onReset ? handleRes : undefined}
      projectPath={projectPath}
      projectId={projectId}
      idea={idea}
    />
  );
});

export type { GroupedRequirement };
