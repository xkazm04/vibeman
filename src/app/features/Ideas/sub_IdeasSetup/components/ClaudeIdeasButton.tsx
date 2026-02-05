'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';

interface ClaudeIdeasButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isProcessing: boolean;
  scanTypesCount: number;
  contextsCount?: number;
  groupsCount?: number;
}

export default function ClaudeIdeasButton({
  onClick,
  disabled = false,
  isProcessing,
  scanTypesCount,
  contextsCount = 0,
  groupsCount = 0
}: ClaudeIdeasButtonProps) {
  // Calculate total tasks: scanTypes * (contexts + groups) (or just scanTypes if none selected)
  const totalItems = contextsCount + groupsCount;
  const multiplier = totalItems > 0 ? totalItems : 1;
  const totalTasks = scanTypesCount * multiplier;

  // Build tooltip text
  let selectionInfo = '';
  if (groupsCount > 0 && contextsCount > 0) {
    selectionInfo = `${contextsCount} contexts + ${groupsCount} groups`;
  } else if (groupsCount > 0) {
    selectionInfo = `${groupsCount} group${groupsCount > 1 ? 's' : ''}`;
  } else if (contextsCount > 0) {
    selectionInfo = `${contextsCount} contexts`;
  }

  const tooltipText = selectionInfo
    ? `Generate ideas using Claude Code (${scanTypesCount} scan types × ${selectionInfo} = ${totalTasks} tasks)`
    : `Generate ideas using Claude Code (${scanTypesCount} scan types)`;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={`flex items-center space-x-2 px-5 py-2 rounded-lg border transition-all duration-300 font-semibold text-sm ${
        isProcessing
          ? 'bg-cyan-500/30 border-cyan-500/50'
          : 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 hover:border-cyan-500/60'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      whileHover={!disabled && !isProcessing ? { scale: 1.05 } : {}}
      whileTap={!disabled && !isProcessing ? { scale: 0.95 } : {}}
      title={tooltipText}
      data-testid="generated-ideas-btn"
    >
      {isProcessing ? (
        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
      ) : (
        <Sparkles className="w-4 h-4 text-cyan-400" />
      )}
      <span className="text-white">
        {isProcessing
          ? 'Creating Tasks...'
          : `Generated ideas (${totalTasks})`}
      </span>
    </motion.button>
  );
}
