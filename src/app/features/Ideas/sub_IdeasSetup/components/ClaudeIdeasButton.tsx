'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Loader2 } from 'lucide-react';

interface ClaudeIdeasButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isProcessing: boolean;
  scanTypesCount: number;
  contextsCount?: number;
}

export default function ClaudeIdeasButton({
  onClick,
  disabled = false,
  isProcessing,
  scanTypesCount,
  contextsCount = 0
}: ClaudeIdeasButtonProps) {
  // Calculate total tasks: scanTypes * contexts (or just scanTypes if no contexts)
  const multiplier = contextsCount > 0 ? contextsCount : 1;
  const totalTasks = scanTypesCount * multiplier;

  const tooltipText = contextsCount > 0
    ? `Generate ideas using Claude Code (${scanTypesCount} scan types × ${contextsCount} contexts = ${totalTasks} tasks)`
    : `Generate ideas using Claude Code (${scanTypesCount} scan types)`;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={`flex items-center space-x-2 px-5 py-2 rounded-lg border transition-all duration-300 font-semibold text-sm ${
        isProcessing
          ? 'bg-amber-500/30 border-amber-500/50'
          : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 hover:border-amber-500/60'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      whileHover={!disabled && !isProcessing ? { scale: 1.05 } : {}}
      whileTap={!disabled && !isProcessing ? { scale: 0.95 } : {}}
      title={tooltipText}
      data-testid="claude-ideas-btn"
    >
      {isProcessing ? (
        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
      ) : (
        <Bot className="w-4 h-4 text-amber-400" />
      )}
      <span className="text-white">
        {isProcessing
          ? 'Creating Tasks...'
          : `Claude Ideas (${totalTasks})`}
      </span>
    </motion.button>
  );
}
