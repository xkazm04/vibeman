'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { FileCode, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { ProjectRequirement } from './lib/types';

interface RequirementCardProps {
  projectName: string;
  projectPath: string;
  requirementName: string;
  status: ProjectRequirement['status'];
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
}

export default function RequirementCard({
  projectName,
  projectPath,
  requirementName,
  status,
  isSelected,
  onToggleSelect,
  onDelete,
}: RequirementCardProps) {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onDelete();
  };

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
        return 'border-gray-700/50 bg-gray-800/30';
    }
  };

  const isDisabled = status === 'running' || status === 'queued';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
      onClick={!isDisabled ? onToggleSelect : undefined}
      onContextMenu={handleContextMenu}
      className={`
        relative rounded-lg border-2 transition-all cursor-pointer
        ${getStatusColor()}
        ${isSelected && !isDisabled ? 'border-emerald-500 ring-2 ring-emerald-500/30' : ''}
        ${isDisabled ? 'cursor-not-allowed opacity-75' : 'hover:border-gray-600'}
        p-3 min-w-[180px] max-w-[220px]
      `}
    >
      {/* Status indicator */}
      <div className="absolute top-2 right-2">
        {getStatusIcon()}
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Requirement name */}
        <div className="text-sm text-gray-200 font-mono truncate" title={requirementName}>
          {requirementName}
        </div>

      </div>

      {/* Selection indicator */}
      {isSelected && !isDisabled && (
        <div className="absolute inset-0 rounded-lg border-2 border-emerald-500 pointer-events-none" />
      )}
    </motion.div>
  );
}
