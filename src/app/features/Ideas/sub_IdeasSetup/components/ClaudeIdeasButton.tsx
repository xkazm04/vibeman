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
}

export default function ClaudeIdeasButton({
  onClick,
  disabled = false,
  isProcessing,
  scanTypesCount,
  contextsCount = 0,
}: ClaudeIdeasButtonProps) {
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
