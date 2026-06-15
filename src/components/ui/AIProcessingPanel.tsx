/**
 * AIProcessingPanel — Multi-stage "AI is processing" affordance with a gradient
 * progress bar and four states (idle / processing / success / error).
 *
 * Salvaged from the (deleted) Social module and promoted into the shared design
 * system. Useful for context generation, blueprint scans, ideas evaluation, and
 * any long-running AI task that needs a progress affordance.
 */

'use client';

import { motion } from 'framer-motion';
import { Sparkles, CheckCircle, X } from 'lucide-react';

export type AIProcessingStatus = 'idle' | 'processing' | 'success' | 'error';

export interface AIProcessingPanelProps {
  /** Current processing state. */
  status: AIProcessingStatus;
  /** Panel heading. */
  title?: string;
  /** Idle-state hint text. */
  idleMessage?: string;
  /** Processing-state status text. */
  processingMessage?: string;
  /** Success-state status text. */
  successMessage?: string;
  /** Error-state status text. */
  errorMessage?: string;
  /** Click handler for the action button (active in the idle state). */
  onProcess?: () => void;
  /** Optional extra class names applied to the root element. */
  className?: string;
}

interface StatusStyle {
  bg: string;
  text: string;
  progress: string;
}

const STATUS_STYLES: Record<AIProcessingStatus, StatusStyle> = {
  idle: { bg: 'from-gray-900/50 to-gray-800/50', text: 'text-gray-400', progress: 'bg-gray-600' },
  processing: { bg: 'from-blue-900/30 to-indigo-900/30', text: 'text-blue-400', progress: 'from-blue-500 to-indigo-500' },
  success: { bg: 'from-green-900/30 to-emerald-900/30', text: 'text-green-400', progress: 'from-green-500 to-emerald-500' },
  error: { bg: 'from-red-900/30 to-rose-900/30', text: 'text-red-400', progress: 'from-red-500 to-rose-500' },
};

export function AIProcessingPanel({
  status,
  title = 'AI Processing',
  idleMessage = 'Select items to process with AI',
  processingMessage = 'Analyzing items...',
  successMessage = 'Completed successfully',
  errorMessage = 'Processing failed',
  onProcess,
  className = '',
}: AIProcessingPanelProps) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.idle;

  return (
    <motion.div
      className={`w-64 p-4 rounded-xl border border-gray-700/30 bg-gradient-to-br ${s.bg} ${className}`}
      animate={
        status === 'processing'
          ? { boxShadow: ['0 0 0 rgba(59,130,246,0)', '0 0 20px rgba(59,130,246,0.2)', '0 0 0 rgba(59,130,246,0)'] }
          : {}
      }
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className={`w-5 h-5 ${s.text}`} />
        <span className="text-sm font-medium text-gray-200">{title}</span>
      </div>
      {status === 'idle' && <p className="text-xs text-gray-500 mb-3">{idleMessage}</p>}
      {status === 'processing' && (
        <>
          <p className="text-xs text-gray-400 mb-2">{processingMessage}</p>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${s.progress}`}
              animate={{ width: ['0%', '70%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </>
      )}
      {status === 'success' && (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-xs text-green-400">{successMessage}</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2">
          <X className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-400">{errorMessage}</span>
        </div>
      )}
      <motion.button
        type="button"
        onClick={status === 'idle' ? onProcess : undefined}
        className={`mt-3 w-full py-2 rounded-lg text-sm font-medium ${
          status === 'idle' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'
        }`}
        whileHover={status === 'idle' ? { scale: 1.02 } : {}}
        whileTap={status === 'idle' ? { scale: 0.98 } : {}}
      >
        {status === 'idle' ? 'Start Processing' : status === 'processing' ? 'Processing...' : 'Done'}
      </motion.button>
    </motion.div>
  );
}

export default AIProcessingPanel;
