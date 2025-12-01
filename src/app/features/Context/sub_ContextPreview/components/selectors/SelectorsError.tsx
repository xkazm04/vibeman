'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

interface SelectorsErrorProps {
  error: string;
  onDismiss: () => void;
  onRetry?: () => void;
  showRetry?: boolean;
}

export default function SelectorsError({
  error,
  onDismiss,
  onRetry,
  showRetry = false,
}: SelectorsErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 font-mono"
    >
      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
      <span className="flex-1">{error}</span>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="p-0.5 hover:bg-red-500/20 rounded"
          title="Retry"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
      <button
        onClick={onDismiss}
        className="p-0.5 hover:bg-red-500/20 rounded"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
