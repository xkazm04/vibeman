/**
 * StatusMessages Component
 * Error and success message displays with animations
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Sparkles } from 'lucide-react';

interface StatusMessagesProps {
  error: string | null;
  successMessage: string | null;
  onClearError: () => void;
}

export function StatusMessages({
  error,
  successMessage,
  onClearError,
}: StatusMessagesProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{error}</span>
            <button
              onClick={onClearError}
              className="ml-auto text-red-400/60 hover:text-red-400"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
      {successMessage && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="mt-3 flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 px-3 py-2 rounded-lg">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
