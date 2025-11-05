'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ErrorOverlayProps {
  /** Error message to display */
  error: string;
  /** Callback when dismiss button is clicked */
  onDismiss?: () => void;
  /** Test ID for automated testing */
  'data-testid'?: string;
}

/**
 * ErrorOverlay - Modal error display
 *
 * Shows an error message with a semi-transparent backdrop overlay.
 * Includes dismiss functionality and smooth animations.
 */
export function ErrorOverlay({
  error,
  onDismiss,
  'data-testid': testId = 'error-overlay',
}: ErrorOverlayProps) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onDismiss}
        data-testid={`${testId}-backdrop`}
      />

      {/* Error Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto z-50"
        data-testid={testId}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-red-950/90 to-gray-900/90 border border-red-500/50 rounded-xl shadow-2xl shadow-red-500/20">
          {/* Blueprint grid pattern */}
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(red 1px, transparent 1px), linear-gradient(90deg, red 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none" />

          {/* Content */}
          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/40">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-red-300 font-medium text-lg mb-1">
                  Error Occurred
                </h4>
                <p className="text-red-200/80 text-sm leading-relaxed break-words">
                  {error}
                </p>
              </div>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                  aria-label="Dismiss error"
                  data-testid={`${testId}-dismiss-btn`}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Actions */}
            {onDismiss && (
              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-200 font-medium transition-all duration-200"
                  data-testid={`${testId}-dismiss-action`}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
