'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCode, Loader2, CheckCircle2, XCircle, Clock, Edit2, Trash2, Layers, RotateCcw } from 'lucide-react';

import { useGlobalModal } from '@/hooks/useGlobalModal';
import { TaskProgress } from './components/TaskProgress';
import { RequirementViewer } from '@/components/RequirementViewer';
import type { ProjectRequirement } from './lib/types';
import type { DbIdea } from '@/app/db';
import ContextMenu from '@/components/ContextMenu';
import {
  effortScale,
  impactScale,
  riskScale,
  EffortIcon,
  ImpactIcon,
  RiskIcon,
} from '@/app/features/Ideas/lib/ideaConfig';
import { useTaskRunnerStore } from './store';
import { createSession as createSessionApi } from './lib/sessionApi';

interface TaskItemProps {
  requirement: ProjectRequirement;
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
  isSelected,
  onToggleSelect,
  onDelete,
  onReset,
  projectPath,
  projectId,
  idea, // Pre-fetched from parent via batch API
}: TaskItemProps) {
  const { requirementName, status } = requirement;
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showDeleteHint, setShowDeleteHint] = useState(false);
  const { showFullScreenModal } = useGlobalModal();

  // Session management
  const taskId = `${projectId}:${requirementName}`;
  const sessionBatchId = useTaskRunnerStore((state) => state.isTaskInAnyBatch(taskId));
  const isInSession = sessionBatchId !== null;
  const { createSessionBatch, getNextAvailableBatchId } = useTaskRunnerStore();

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

  const handleCreateSession = async () => {
    const availableBatchId = getNextAvailableBatchId();
    if (!availableBatchId) {
      console.warn('No available batch slots');
      return;
    }

    const sessionName = `Session for ${requirementName}`;

    try {
      // Create session in database
      const result = await createSessionApi({
        projectId,
        name: sessionName,
        taskId,
        requirementName,
      });

      console.log('📦 Created session in database:', result.session.id);

      // Create session batch in local store
      createSessionBatch(
        availableBatchId,
        projectId,
        projectPath,
        sessionName,
        taskId,
        requirementName
      );
    } catch (error) {
      console.error('Failed to create session:', error);
      // Still create in local store for offline support
      createSessionBatch(
        availableBatchId,
        projectId,
        projectPath,
        sessionName,
        taskId,
        requirementName
      );
    }
  };

  // Determine if task is in progress (running or queued)
  const isInProgress = status === 'running' || status === 'queued';

  // Determine if task has a status that can be reset (not idle/open)
  const hasStatus = status && status !== 'idle';

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
        // Create Session (only if not in session and slot available)
        ...(!isInSession && getNextAvailableBatchId() !== null
          ? [
              {
                label: 'Create Session',
                icon: Layers,
                onClick: handleCreateSession,
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

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-3 h-3 text-blue-400" />;
      case 'completed':
        return <CheckCircle2 className="w-3 h-3 text-green-400" />;
      case 'failed':
      case 'session-limit':
        return <XCircle className="w-3 h-3 text-red-400" />;
      case 'queued':
        return <Clock className="w-3 h-3 text-amber-400" />;
      default:
        return <FileCode className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    // Purple background for tasks in a session (takes precedence)
    if (isInSession) {
      switch (status) {
        case 'running':
          return 'border-purple-500/60 bg-purple-500/15';
        case 'completed':
          return 'border-purple-400/50 bg-purple-500/10';
        case 'failed':
        case 'session-limit':
          return 'border-red-500/40 bg-purple-500/5';
        case 'queued':
          return 'border-purple-500/40 bg-purple-500/10';
        default:
          return 'border-purple-700/50 bg-purple-900/20';
      }
    }

    switch (status) {
      case 'running':
        return 'border-blue-500/40 bg-blue-500/5';
      case 'completed':
        return 'border-green-500/40 bg-green-500/5';
      case 'failed':
      case 'session-limit':
        return 'border-red-500/40 bg-red-500/5';
      case 'queued':
        return 'border-amber-500/40 bg-amber-500/5';
      default:
        return 'border-gray-700/30 bg-gray-800/20';
    }
  };

  const isDisabled = status === 'running' || status === 'queued';

  const canDelete = status !== 'running' && status !== 'queued';

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
        onClick={!isDisabled ? onToggleSelect : undefined}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setShowDeleteHint(true)}
        onMouseLeave={() => setShowDeleteHint(false)}
        className={`
          relative rounded-md border transition-all cursor-pointer
          ${getStatusColor()}
          ${isSelected && !isDisabled ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
          ${isDisabled ? 'cursor-not-allowed opacity-75' : 'hover:border-gray-600/60'}
          px-2.5 py-2 flex items-center justify-between gap-2
        `}
        data-testid={`task-item-${requirementName}`}
      >
        {/* Requirement name and icon */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getStatusIcon()}
          <span className="text-sm text-gray-200 font-mono truncate" title={requirementName}>
            {requirementName}
          </span>
          {/* Session indicator */}
          {isInSession && (
            <span title="In session">
              <Layers className="w-3 h-3 text-purple-400 flex-shrink-0" />
            </span>
          )}
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
          </div>
        )}

        {/* Selection indicator */}
        {isSelected && !isDisabled && (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
        )}

        {/* Progress bar for running/queued tasks */}
        {(status === 'running' || status === 'queued') && (
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
              className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 transition-colors"
              title="Delete task"
              data-testid={`task-delete-btn-${requirementName}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
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
