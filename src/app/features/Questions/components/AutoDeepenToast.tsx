'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, AlertTriangle } from 'lucide-react';
import type { QuestionAutoDeepenedEvent } from '@/lib/events/types';

interface AutoDeepenToastProps {
  /** The auto-deepen result to display, or null to hide the toast. */
  result: QuestionAutoDeepenedEvent | null;
  /** Called when the user dismisses the toast. */
  onDismiss: () => void;
}

/**
 * Floating notification toast for auto-deepen results.
 *
 * Appears when a question:auto_deepened SSE event arrives after the system
 * detects ambiguity or generates follow-up questions. Uses cyan styling for
 * successful deepening and amber for ambiguity warnings. Auto-dismissed by
 * the parent after 6 seconds.
 */
export default function AutoDeepenToast({ result, onDismiss }: AutoDeepenToastProps) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 40, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 40, x: '-50%' }}
          className="fixed bottom-6 left-1/2 z-50 max-w-md w-full"
        >
          <div className={`rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm ${
            result.deepened
              ? 'bg-cyan-950/90 border-cyan-500/30'
              : 'bg-amber-950/90 border-amber-500/30'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-1.5 rounded-lg ${
                result.deepened ? 'bg-cyan-500/15' : 'bg-amber-500/15'
              }`}>
                {result.deepened ? (
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  result.deepened ? 'text-cyan-300' : 'text-amber-300'
                }`}>
                  {result.deepened
                    ? `Auto-deepened: ${result.generatedCount} follow-up${result.generatedCount !== 1 ? 's' : ''} generated`
                    : 'Ambiguity detected'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {result.summary}
                </p>
              </div>
              <button
                onClick={onDismiss}
                className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
