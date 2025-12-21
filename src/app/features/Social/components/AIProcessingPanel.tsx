'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, Sparkles } from 'lucide-react';
import type { AIProcessingStatus } from '../lib/types/aiTypes';

interface AIProcessingPanelProps {
  selectedCount: number;
  processingStatus: AIProcessingStatus;
  progress?: { current: number; total: number };
  error?: string;
  onProcess: () => void;
  onClearSelection: () => void;
  onSelectAllNew: () => void;
  newItemsCount: number;
}

export default function AIProcessingPanel({
  selectedCount,
  processingStatus,
  progress,
  error,
  onProcess,
  onClearSelection,
  onSelectAllNew,
  newItemsCount,
}: AIProcessingPanelProps) {
  const isProcessing = processingStatus === 'processing';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 p-4 bg-gray-900/40 backdrop-blur-md border border-gray-700/40 rounded-lg"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left: AI Analysis title with selection count and quick actions */}
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* AI Analysis title */}
            <span className="text-sm font-medium text-gray-200">
              AI Analysis
            </span>
          </div>

          <div className="h-4 w-px bg-gray-700" />

          {/* Quick selection buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSelectAllNew}
              disabled={newItemsCount === 0 || isProcessing}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select all new ({newItemsCount})
            </button>
            <button
              onClick={onClearSelection}
              disabled={selectedCount === 0 || isProcessing}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear selection
            </button>
          </div>
        </div>

        {/* Center: Powered by Gemini */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-md">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-medium bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Powered by Gemini 2.5 Flash
          </span>
        </div>

        {/* Right: Process button */}
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {error && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="text-xs text-red-400 max-w-[200px] truncate"
                title={error}
              >
                {error}
              </motion.span>
            )}
          </AnimatePresence>

          <button
            onClick={onProcess}
            disabled={selectedCount === 0 || isProcessing}
            className={`
              relative px-4 py-2 text-sm font-medium rounded-md transition-all
              ${
                isProcessing
                  ? 'bg-cyan-500/20 text-cyan-400 cursor-wait'
                  : selectedCount > 0
                  ? 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-lg shadow-cyan-500/25'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <span className={isProcessing ? 'opacity-0' : ''}>
              Process with AI
            </span>
            {isProcessing && (
              <span className="absolute inset-0 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>
                  {progress ? `${progress.current}/${progress.total}` : 'Processing...'}
                </span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <AnimatePresence>
        {isProcessing && progress && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-gray-700/40"
          >
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Analyzing feedback with Gemini...</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success state */}
      <AnimatePresence>
        {processingStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-gray-700/40 flex items-center gap-2 text-green-400"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Analysis complete! Items moved to Analyzed column.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
