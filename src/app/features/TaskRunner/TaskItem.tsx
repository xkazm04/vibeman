'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, RotateCcw, FileSearch } from 'lucide-react';

import { useGlobalModal } from '@/hooks/useGlobalModal';
import { TaskProgress } from './components/TaskProgress';
import { RequirementViewer } from '@/components/RequirementViewer';
import { getTheme } from './lib/taskStatusUtils';
import type { ProjectRequirement, RequirementIdString } from './lib/types';
import type { DbIdea } from '@/app/db/models/types';
import { TruncateTooltip } from '@/components/ui/TruncateTooltip';
import ContextMenu from '@/components/ContextMenu';
import {
  effortScale,
  impactScale,
  riskScale,
  EffortIcon,
  ImpactIcon,
  RiskIcon,
} from '@/app/features/Ideas/lib/ideaConfig';
import { useLiveTaskActivity, getPhaseColor } from './hooks/useLiveTaskActivity';
import { DependencyBadge } from './components/DependencyBadge';
import { useDependencyStore } from './store/dependencyStore';


interface TaskItemProps {
  requirement: ProjectRequirement;
  requirementId?: string; // Composite requirement ID for activity/dependency lookup
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onReset?: () => void; // Reset task status to idle/open
  projectPath: string;
  projectId: string;
  idea?: DbIdea | null; // Pre-fetched idea from parent (batch loaded)
}

const TaskItem = React.memo(function TaskItem({
  requirement,
  requirementId: reqIdProp,
  isSelected,
  onToggleSelect,
  onDelete,
  onReset,
  projectPath,
  projectId,
  idea, // Pre-fetched from parent via batch API
}: TaskItemProps) {
  const { requirementName, status } = requirement;
  const reqId = reqIdProp ?? `${projectId}:${requirementName}`;
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showDeleteHint, setShowDeleteHint] = useState(false);
  const { showFullScreenModal } = useGlobalModal();

  // Live activity for running tasks
  const activity = useLiveTaskActivity(reqId, status.type);

  // Dependency linking state
  const linkingFrom = useDependencyStore((s) => s.linkingFrom);
  const isLinkSource = linkingFrom === reqId;
  const isLinkingMode = linkingFrom !== null;
  const startLinking = useDependencyStore((s) => s.startLinking);
  const completeLinking = useDependencyStore((s) => s.completeLinking);
  const cancelLinking = useDependencyStore((s) => s.cancelLinking);

  // Determine if task is in progress (running or queued) — needed before handleClick
  const isInProgress = status.type === 'running' || status.type === 'queued';
  const isDisabled = isInProgress;

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Cmd+Click (Mac) or Ctrl+Click (Win/Linux) for dependency linking
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!linkingFrom) {
        startLinking(reqId as RequirementIdString);
      } else if (linkingFrom === reqId) {
        cancelLinking();
      } else {
        completeLinking(reqId as RequirementIdString);
      }
      return;
    }
    if (!isDisabled) onToggleSelect();
  }, [linkingFrom, reqId, startLinking, completeLinking, cancelLinking, onToggleSelect, isDisabled]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuOpen(true);
  };

  const handleEdit = () => {
    showFullScreenModal(
      `Edit Requirement: ${requirementName}`,
      <RequirementViewer
        projectPath={projectPath}
        requirementName={requirementName}
        allowEdit={true}
      />,
      {
        icon: Edit2,
        iconBgColor: 'from-purple-600/20 to-pink-600/20',
        iconColor: 'text-purple-400',
        maxWidth: 'max-w-5xl',
        maxHeight: 'max-h-[90vh]',
      }
    );
  };

  // Determine if task has a status that can be reset (not idle/open)
  const hasStatus = status.type !== 'idle';

  // Build context menu items based on task state
  const contextMenuItems = isInProgress
    ? [
        // In Progress: Show only Reset and Delete
        ...(onReset
          ? [
              {
                label: 'Reset to Open',
                icon: RotateCcw,
                onClick: onReset,
              },
            ]
          : []),
        {
          label: 'Delete Requirement',
          icon: Trash2,
          destructive: true,
          onClick: onDelete,
        },
      ]
    : [
        // Open or Completed/Failed: Show full menu
        // Reset option (only if task has a status to reset from)
        ...(hasStatus && onReset
          ? [
              {
                label: 'Reset to Open',
                icon: RotateCcw,
                onClick: onReset,
              },
            ]
          : []),
        {
          label: 'Edit Requirement',
          icon: Edit2,
          onClick: handleEdit,
        },
        {
          label: 'Delete Requirement',
          icon: Trash2,
          destructive: true,
          onClick: onDelete,
        },
      ];

  const theme = getTheme(status.type);
  const StatusIcon = theme.Icon;
  const statusColorClass = `${theme.border} ${theme.bg}`;
  const statusIconSpin = status.type === 'running' ? ' animate-spin' : '';

  const canDelete = status.type !== 'running' && status.type !== 'queued';

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setShowDeleteHint(true)}
        onMouseLeave={() => setShowDeleteHint(false)}
        className={`
          relative rounded-md border transition-all cursor-pointer
          ${statusColorClass}
          ${isSelected && !isDisabled ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
          ${isLinkSource ? 'ring-2 ring-purple-500/50 border-purple-500/40' : ''}
          ${isLinkingMode && !isLinkSource ? 'border-dashed border-purple-500/30 hover:border-purple-400/60' : ''}
          ${isDisabled ? 'cursor-not-allowed opacity-75' : 'hover:border-gray-600/60'}
          px-2.5 py-2 flex flex-col gap-1
        `}
        data-testid={`task-item-${requirementName}`}
      >
        {/* Top row: icon + name + badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <StatusIcon className={`w-3 h-3 flex-shrink-0 ${theme.text}${statusIconSpin}`} />
            <TruncateTooltip text={requirementName}>
              <span className="text-sm text-gray-200 font-mono truncate block">
                {requirementName}
              </span>
            </TruncateTooltip>
            <DependencyBadge requirementId={reqId} />
          </div>

          {/* Metric indicators */}
          {idea && (idea.impact || idea.effort || idea.risk) && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {idea.impact && (
                <div
                  className="w-5 h-5 rounded flex items-center justify-center bg-gray-800/60"
                  title={`Impact: ${idea.impact}/10 - ${impactScale.entries[idea.impact]?.description || ''}`}
                >
                  <ImpactIcon className={`w-3 h-3 ${impactScale.entries[idea.impact]?.color || 'text-gray-400'}`} />
                </div>
              )}
              {idea.effort && (
                <div
                  className="w-5 h-5 rounded flex items-center justify-center bg-gray-800/60"
                  title={`Effort: ${idea.effort}/10 - ${effortScale.entries[idea.effort]?.description || ''}`}
                >
                  <EffortIcon className={`w-3 h-3 ${effortScale.entries[idea.effort]?.color || 'text-gray-400'}`} />
                </div>
              )}
              {idea.risk && (
                <div
                  className="w-5 h-5 rounded flex items-center justify-center bg-gray-800/60"
                  title={`Risk: ${idea.risk}/10 - ${riskScale.entries[idea.risk]?.description || ''}`}
                >
                  <RiskIcon className={`w-3 h-3 ${riskScale.entries[idea.risk]?.color || 'text-gray-400'}`} />
                </div>
              )}
              {idea.detailed === 1 && (
                <div
                  className="w-5 h-5 rounded flex items-center justify-center bg-amber-500/10"
                  title="Detailed: includes implementation procedure"
                >
                  <FileSearch className="w-3 h-3 text-amber-400" />
                </div>
              )}
            </div>
          )}

          {/* Selection indicator */}
          {isSelected && !isDisabled && (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          )}
        </div>

        {/* Live activity row for running tasks */}
        {status.type === 'running' && activity.lastMessage && (
          <div className="flex items-center gap-1.5 pl-5 min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse ${getPhaseColor(activity.phase)}`} />
            <span className="text-2xs text-gray-500 font-mono truncate">
              {activity.lastMessage}
            </span>
          </div>
        )}

        {/* Progress bar for running/queued tasks */}
        {(status.type === 'running' || status.type === 'queued') && (
          <div className="absolute bottom-0 left-0 right-0">
            <TaskProgress status={status} />
          </div>
        )}

        {/* Delete button overlay */}
        <AnimatePresence>
          {showDeleteHint && canDelete && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleDeleteClick}
              className="absolute top-1/2 -translate-y-1/2 right-2 p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 transition-colors before:absolute before:inset-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-11 before:h-11 before:content-['']"
              title="Delete task"
              data-testid={`task-delete-btn-${requirementName}`}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenuOpen}
        position={contextMenuPosition}
        onClose={() => setContextMenuOpen(false)}
        items={contextMenuItems}
      />
    </>
  );
});

export default TaskItem;
