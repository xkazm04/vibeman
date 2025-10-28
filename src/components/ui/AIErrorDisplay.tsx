'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, X, Bug, WifiOff, Zap } from 'lucide-react';

interface AIErrorDisplayProps {
  error: Error;
  onRetry: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

/**
 * Displays AI-related errors with actionable messages and retry options.
 * Provides context-specific guidance based on the error type.
 */
export default function AIErrorDisplay({
  error,
  onRetry,
  onDismiss,
  compact = false,
}: AIErrorDisplayProps) {
  // Categorize error type for better UX
  const errorType = categorizeError(error);
  const errorDetails = getErrorDetails(errorType, error);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg"
      >
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-300 font-medium truncate">
            {errorDetails.title}
          </p>
        </div>
        <motion.button
          onClick={onRetry}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-md text-sm text-red-300 font-medium transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </motion.button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm"
    >
      {/* Icon Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/20 rounded-lg">
            {errorDetails.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-300">
              {errorDetails.title}
            </h3>
            <p className="text-sm text-red-400/80 mt-0.5">
              {errorDetails.subtitle}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-red-400" />
          </button>
        )}
      </div>

      {/* Error Message */}
      <div className="mb-4 p-4 bg-black/20 rounded-lg border border-red-500/20">
        <p className="text-sm text-red-200 leading-relaxed">
          {errorDetails.message}
        </p>
      </div>

      {/* Suggested Actions */}
      {errorDetails.suggestions.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-red-300/80 uppercase tracking-wide mb-2">
            Suggested Actions
          </p>
          <ul className="space-y-1.5">
            {errorDetails.suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-red-200/90">
                <span className="text-red-400 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Technical Details (collapsible) */}
      <details className="mb-4">
        <summary className="text-sm font-semibold text-red-300/60 uppercase tracking-wide cursor-pointer hover:text-red-300/80 transition-colors">
          Technical Details
        </summary>
        <div className="mt-2 p-3 bg-black/30 rounded-lg border border-red-500/10">
          <p className="text-sm text-red-200/70 font-mono break-all">
            {error.message}
          </p>
          {error.stack && (
            <pre className="mt-2 text-sm text-red-200/50 overflow-x-auto">
              {error.stack.split('\n').slice(0, 5).join('\n')}
            </pre>
          )}
        </div>
      </details>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <motion.button
          onClick={onRetry}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-300 font-semibold transition-all shadow-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Operation
        </motion.button>

        <a
          href="https://github.com/anthropics/claude-code/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-red-400/60 hover:text-red-400 underline transition-colors"
        >
          Report Issue
        </a>
      </div>
    </motion.div>
  );
}

// Error categorization logic
type ErrorType = 'network' | 'api' | 'timeout' | 'validation' | 'unknown';

function categorizeError(error: Error): ErrorType {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }
  if (message.includes('api') || message.includes('status') || message.includes('response')) {
    return 'api';
  }
  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return 'validation';
  }

  return 'unknown';
}

// Get contextual error details based on error type
function getErrorDetails(errorType: ErrorType, error: Error) {
  switch (errorType) {
    case 'network':
      return {
        icon: <WifiOff className="w-5 h-5 text-red-400" />,
        title: 'Network Connection Issue',
        subtitle: 'Unable to reach AI service',
        message: 'The AI service could not be reached. Please check your internet connection and try again.',
        suggestions: [
          'Verify your internet connection is stable',
          'Check if the AI service is currently available',
          'Try switching to a different network',
          'Wait a moment and retry the operation',
        ],
      };

    case 'timeout':
      return {
        icon: <Zap className="w-5 h-5 text-red-400" />,
        title: 'Request Timeout',
        subtitle: 'Operation took too long',
        message: 'The AI generation process exceeded the maximum allowed time. This can happen with complex requests.',
        suggestions: [
          'Try reducing the scope of your request (fewer files, simpler task)',
          'Retry with a faster AI model if available',
          'Check your network speed and stability',
          'The service may be experiencing high load - try again later',
        ],
      };

    case 'api':
      return {
        icon: <Bug className="w-5 h-5 text-red-400" />,
        title: 'AI Service Error',
        subtitle: 'The AI provider returned an error',
        message: error.message || 'The AI service encountered an error while processing your request.',
        suggestions: [
          'Verify your API credentials are correct',
          'Check if you have sufficient API credits/quota',
          'Try selecting a different AI provider',
          'Review the technical details below for more information',
        ],
      };

    case 'validation':
      return {
        icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
        title: 'Validation Error',
        subtitle: 'Invalid input or configuration',
        message: error.message || 'The provided input did not meet the required criteria.',
        suggestions: [
          'Review the form inputs and ensure all required fields are filled',
          'Check that file paths are valid and accessible',
          'Verify the selected options are compatible',
          'Consult the documentation for input requirements',
        ],
      };

    default:
      return {
        icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
        title: 'Unexpected Error',
        subtitle: 'Something went wrong',
        message: error.message || 'An unexpected error occurred during AI generation.',
        suggestions: [
          'Try the operation again',
          'Refresh the page and retry',
          'Check the browser console for additional details',
          'Report this issue if it persists',
        ],
      };
  }
}
