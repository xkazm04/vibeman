'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileCode, Loader2, CheckCircle2, XCircle, Clock, Edit2, Trash2 } from 'lucide-react';

import { useGlobalModal } from '@/hooks/useGlobalModal';
import { RequirementViewer } from '@/components/RequirementViewer';
import type { ProjectRequirement } from './lib/types';
import ContextMenu from '@/components/ContextMenu';

interface TaskItemProps {
  requirement: ProjectRequirement;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  projectPath: string;
}

export default function TaskItem({
  requirement,
  isSelected,
  onToggleSelect,
  onDelete,
  projectPath,
}: TaskItemProps) {
  const { requirementName, status } = requirement;
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const { showFullScreenModal } = useGlobalModal();

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

  const contextMenuItems = [
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
        return <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />;
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isDisabled ? onToggleSelect : undefined}
        onContextMenu={handleContextMenu}
        className={`
          relative rounded-md border transition-all cursor-pointer
          ${getStatusColor()}
          ${isSelected && !isDisabled ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
          ${isDisabled ? 'cursor-not-allowed opacity-75' : 'hover:border-gray-600/60'}
          px-2.5 py-2 flex items-center justify-between gap-2
        `}
      >
        {/* Requirement name and icon */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getStatusIcon()}
          <span className="text-sm text-gray-200 font-mono truncate" title={requirementName}>
            {requirementName}
          </span>
        </div>

        {/* Selection indicator */}
        {isSelected && !isDisabled && (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
        )}
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
}
