'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, RefreshCw, AlertCircle, XCircle } from 'lucide-react';

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorDisplayProps {
  error: string | null;
  severity?: ErrorSeverity;
  context?: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

const severityConfig = {
  error: {
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
    iconColor: 'text-red-400',
    Icon: XCircle,
  },
  warning: {
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    iconColor: 'text-amber-400',
    Icon: AlertTriangle,
  },
  info: {
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    iconColor: 'text-blue-400',
    Icon: AlertCircle,
  },
};

export default function ErrorDisplay({
  error,
  severity = 'error',
  context,
  onDismiss,
  onRetry,
  className = '',
  showIcon = true,
  compact = false,
}: ErrorDisplayProps) {
  if (!error) return null;

  const config = severityConfig[severity];
  const { bgColor, borderColor, textColor, iconColor, Icon } = config;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ duration: 0.2 }}
        className={`${bgColor} ${borderColor} border rounded-lg ${compact ? 'p-2' : 'p-3'} ${className}`}
        data-testid="error-display"
      >
        <div className="flex items-start gap-2">
          {showIcon && (
            <Icon className={`${iconColor} ${compact ? 'w-3 h-3' : 'w-4 h-4'} mt-0.5 flex-shrink-0`} />
          )}

          <div className="flex-1 min-w-0">
            {context && (
              <p className={`${textColor} ${compact ? 'text-xs' : 'text-sm'} font-mono font-medium mb-1`}>
                {context}
              </p>
            )}
            <p className={`${textColor} ${compact ? 'text-xs' : 'text-sm'} font-mono break-words`}>
              {error}
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {onRetry && (
              <motion.button
                onClick={onRetry}
                className={`p-1 ${textColor} hover:bg-gray-700/50 rounded transition-colors`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Retry"
                data-testid="error-retry-btn"
              >
                <RefreshCw className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
              </motion.button>
            )}

            {onDismiss && (
              <motion.button
                onClick={onDismiss}
                className={`p-1 ${textColor} hover:bg-gray-700/50 rounded transition-colors`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Dismiss"
                data-testid="error-dismiss-btn"
              >
                <X className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Inline error message for form fields
 */
export function InlineError({
  error,
  className = '',
}: {
  error: string | null;
  className?: string;
}) {
  if (!error) return null;

  return (
    <motion.p
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className={`text-xs text-red-400 font-mono mt-1 ${className}`}
      data-testid="inline-error"
    >
      {error}
    </motion.p>
  );
}

/**
 * Error boundary fallback component
 */
export function ErrorFallback({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4" data-testid="error-fallback">
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-400 font-mono mb-2">{title}</h3>
        {message && (
          <p className="text-sm text-gray-400 font-mono mb-4">{message}</p>
        )}
        {onRetry && (
          <motion.button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/30 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-testid="error-fallback-retry-btn"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
