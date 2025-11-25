/**
 * Status Bar Component
 *
 * Displays generation progress or error messages
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface StatusBarProps {
  isGenerating: boolean;
  generationProgress: string;
  generationError: string | null;
  onDismissError: () => void;
  onRetry: () => void;
}

export default function StatusBar({
  isGenerating,
  generationProgress,
  generationError,
  onDismissError,
  onRetry,
}: StatusBarProps) {
  const isVisible = isGenerating || generationError !== null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden border-b border-white/5"
        >
          {generationError ? (
            <div className="p-3 bg-red-500/10 border-l-2 border-red-500 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-red-300 mb-1">Generation Failed</p>
                <p className="text-xs text-red-400/80 break-words">{generationError}</p>
                <button
                  onClick={onRetry}
                  className="mt-2 text-xs text-red-300 hover:text-red-200 underline transition-colors"
                  data-testid="retry-generation-btn"
                >
                  Try Again
                </button>
              </div>
              <button
                onClick={onDismissError}
                className="text-red-400 hover:text-red-300 transition-colors"
                data-testid="dismiss-error-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-3 bg-purple-500/10 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin flex-shrink-0" />
              <p className="text-xs font-medium text-purple-300">{generationProgress}</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
