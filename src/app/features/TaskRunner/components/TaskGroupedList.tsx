'use client';

import React from 'react';
import TaskItem from '../TaskItem';
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
}: TaskGroupedListProps) {
  if (groupedRequirements.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-[10px] text-gray-600">
        No requirements
      </div>
    );
  }

  return (
    <>
      {groupedRequirements.map((group) => (
        <div key={group.key} className="mb-3 last:mb-0">
          {/* Context Divider */}
          <div className="flex items-center gap-2 py-1 px-1 mb-1">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: group.context?.color || '#4b5563' }}
            />
            <span
              className="text-[10px] font-medium truncate"
              style={{ color: group.context?.color || '#9ca3af' }}
            >
              {group.context
                ? group.context.groupName
                  ? `${group.context.groupName} - ${group.context.name}`
                  : group.context.name
                : 'Without Context'}
            </span>
            <div className="flex-1 h-px bg-gray-700/40" />
            <span className="text-[9px] text-gray-500 font-mono">{group.requirements.length}</span>
          </div>

          {/* Tasks in this group */}
          <div className="space-y-1 pl-1">
            {group.requirements.map((req) => {
              const reqId = getRequirementId(req);
              return (
                <TaskItem
                  key={reqId}
                  requirement={req}
                  isSelected={selectedRequirements.has(reqId)}
                  onToggleSelect={() => onToggleSelect(reqId)}
                  onDelete={() => onDelete(reqId)}
                  onReset={onReset ? () => onReset(reqId) : undefined}
                  projectPath={req.projectPath}
                  projectId={projectId}
                  idea={ideasMap[req.requirementName]}
                />
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export type { GroupedRequirement };
