/**
 * KanbanTaskCard
 *
 * Draggable task card for the kanban board view.
 * Shows status, name, project badge, live activity, and dependency info.
 */

'use client';

import React, { useCallback } from 'react';
import { GripVertical } from 'lucide-react';
import { useDraggableItem } from '@/hooks/dnd';
import { getTheme } from '../lib/taskStatusUtils';
import { statusToKanbanColumn } from '../lib/types';
import type { ProjectRequirement } from '../lib/types';
import { useLiveTaskActivity, getPhaseColor } from '../hooks/useLiveTaskActivity';
import { DependencyBadge } from './DependencyBadge';
import { TaskProgress } from './TaskProgress';
import { TruncateTooltip } from '@/components/ui/TruncateTooltip';
import { useDependencyStore } from '../store/dependencyStore';

interface KanbanTaskCardProps {
  requirement: ProjectRequirement;
  requirementId: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onReset?: () => void;
}

const KanbanTaskCard = React.memo(function KanbanTaskCard({
  requirement,
  requirementId,
  isSelected,
  onToggleSelect,
  onReset,
}: KanbanTaskCardProps) {
  const { requirementName, status, projectName } = requirement;
  const theme = getTheme(status.type);
  const StatusIcon = theme.Icon;
  const isRunning = status.type === 'running';
  const isDisabled = isRunning || status.type === 'queued';

  // DnD
  const {
    ref,
    attributes,
    listeners,
    isDragging,
  } = useDraggableItem({
    id: requirementId,
    data: {
      type: 'kanban-task',
      requirementId,
      currentColumn: statusToKanbanColumn(status.type),
      statusType: status.type,
    },
    disabled: isRunning, // running tasks can't be dragged
  });

  // Live activity
  const activity = useLiveTaskActivity(requirementId, status.type);

  // Dependency linking
  const linkingFrom = useDependencyStore((s) => s.linkingFrom);
  const isLinkSource = linkingFrom === requirementId;
  const isLinkingMode = linkingFrom !== null;
  const startLinking = useDependencyStore((s) => s.startLinking);
  const completeLinking = useDependencyStore((s) => s.completeLinking);
  const cancelLinking = useDependencyStore((s) => s.cancelLinking);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!linkingFrom) startLinking(requirementId);
      else if (linkingFrom === requirementId) cancelLinking();
      else completeLinking(requirementId);
      return;
    }
    if (!isDisabled) onToggleSelect();
  }, [linkingFrom, requirementId, startLinking, completeLinking, cancelLinking, onToggleSelect, isDisabled]);

  return (
    <div
      ref={ref}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`
        group relative rounded-lg border transition-all cursor-pointer
        ${theme.border} ${theme.bg}
        ${isSelected && !isDisabled ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
        ${isLinkSource ? 'ring-2 ring-purple-500/50 border-purple-500/40' : ''}
        ${isLinkingMode && !isLinkSource ? 'border-dashed border-purple-500/30 hover:border-purple-400/60' : ''}
        ${isDragging ? 'opacity-40 scale-95' : ''}
        ${isDisabled ? 'cursor-not-allowed' : 'hover:border-gray-600/60'}
        p-2.5
      `}
      data-testid={`kanban-card-${requirementName}`}
    >
      {/* Drag handle */}
      {!isRunning && (
        <div className="absolute top-2 right-1.5 opacity-0 group-hover:opacity-40 transition-opacity">
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>
      )}

      {/* Status + name row */}
      <div className="flex items-center gap-2 min-w-0 pr-4">
        <StatusIcon
          className={`w-3 h-3 flex-shrink-0 ${theme.text}${isRunning ? ' animate-spin' : ''}`}
        />
        <TruncateTooltip text={requirementName}>
          <span className="text-xs text-gray-200 font-medium truncate block">
            {requirementName}
          </span>
        </TruncateTooltip>
      </div>

      {/* Meta row: project badge + dependency badge */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-2xs px-1.5 py-0.5 rounded bg-gray-800/60 text-gray-500 truncate max-w-[120px]">
          {projectName}
        </span>
        <DependencyBadge requirementId={requirementId} />
        {isSelected && !isDisabled && (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 ml-auto" />
        )}
      </div>

      {/* Live activity */}
      {isRunning && activity.lastMessage && (
        <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse ${getPhaseColor(activity.phase)}`} />
          <span className="text-2xs text-gray-500 font-mono truncate">
            {activity.lastMessage}
          </span>
        </div>
      )}

      {/* Progress bar */}
      {(status.type === 'running' || status.type === 'queued') && (
        <div className="absolute bottom-0 left-0 right-0 rounded-b-lg overflow-hidden">
          <TaskProgress status={status} />
        </div>
      )}
    </div>
  );
});

export default KanbanTaskCard;
