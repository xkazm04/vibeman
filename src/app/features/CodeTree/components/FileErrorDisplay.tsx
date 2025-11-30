'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  RefreshCw,
  X,
  FileX,
  Lock,
  GitMerge,
  Clock,
  HardDrive,
  AlertCircle,
  Eye,
  Trash2,
} from 'lucide-react';
import {
  FileOperationError,
  FileOperationErrorType,
  classifyFileError,
  getFileOperationErrorDetails,
} from '../lib/fileOperationErrors';

interface FileErrorDisplayProps {
  errorMessage: string;
  filePath: string;
  operation: 'read' | 'write';
  statusCode?: number;
  onRetry: () => void;
  onDismiss?: () => void;
  onDiscardChanges?: () => void;
  onSwitchToReadOnly?: () => void;
  hasUnsavedChanges?: boolean;
}

function getErrorIcon(errorType: FileOperationErrorType) {
  switch (errorType) {
    case 'file_not_found':
      return <FileX className="w-5 h-5 text-red-400" />;
    case 'permission_denied':
      return <Lock className="w-5 h-5 text-red-400" />;
    case 'write_conflict':
      return <GitMerge className="w-5 h-5 text-amber-400" />;
    case 'network_timeout':
      return <Clock className="w-5 h-5 text-red-400" />;
    case 'disk_full':
      return <HardDrive className="w-5 h-5 text-red-400" />;
    case 'file_locked':
      return <Lock className="w-5 h-5 text-amber-400" />;
    case 'invalid_path':
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    default:
      return <AlertTriangle className="w-5 h-5 text-red-400" />;
  }
}

function getErrorColorClass(errorType: FileOperationErrorType) {
  // Warning-level errors (recoverable)
  if (errorType === 'write_conflict' || errorType === 'file_locked') {
    return {
      bg: 'from-amber-900/30 to-amber-800/20',
      border: 'border-amber-500/30',
      text: 'text-amber-300',
      textMuted: 'text-amber-400/80',
      textLight: 'text-amber-200/90',
      buttonBg: 'bg-amber-500/20 hover:bg-amber-500/30',
      buttonBorder: 'border-amber-500/40',
    };
  }
  // Error-level errors
  return {
    bg: 'from-red-900/30 to-red-800/20',
    border: 'border-red-500/30',
    text: 'text-red-300',
    textMuted: 'text-red-400/80',
    textLight: 'text-red-200/90',
    buttonBg: 'bg-red-500/20 hover:bg-red-500/30',
    buttonBorder: 'border-red-500/40',
  };
}

export default function FileErrorDisplay({
  errorMessage,
  filePath,
  operation,
  statusCode,
  onRetry,
  onDismiss,
  onDiscardChanges,
  onSwitchToReadOnly,
  hasUnsavedChanges = false,
}: FileErrorDisplayProps) {
  const errorType = classifyFileError(errorMessage, statusCode);
  const errorDetails = getFileOperationErrorDetails(errorType, filePath, operation);
  const colors = getErrorColorClass(errorType);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative bg-gradient-to-br ${colors.bg} ${colors.border} border rounded-xl p-5 backdrop-blur-sm`}
      data-testid="file-error-display"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 ${colors.buttonBg} rounded-lg`}>
            {getErrorIcon(errorType)}
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${colors.text}`}>
              {errorDetails.title}
            </h3>
            <p className={`text-sm ${colors.textMuted} mt-0.5`}>
              {operation === 'read' ? 'Failed to read file' : 'Failed to save file'}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`p-1.5 ${colors.buttonBg} rounded-lg transition-colors`}
            data-testid="file-error-dismiss-btn"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Error Message */}
      <div className="mb-4 p-4 bg-black/20 rounded-lg border border-white/5">
        <p className={`text-sm ${colors.textLight} leading-relaxed`}>
          {errorDetails.message}
        </p>
      </div>

      {/* Suggestions */}
      {errorDetails.suggestions.length > 0 && (
        <div className="mb-4">
          <p className={`text-sm font-semibold ${colors.textMuted} uppercase tracking-wide mb-2`}>
            What you can do
          </p>
          <ul className="space-y-1.5">
            {errorDetails.suggestions.map((suggestion, idx) => (
              <li key={idx} className={`flex items-start gap-2 text-sm ${colors.textLight}`}>
                <span className={colors.text}>•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Technical Details */}
      <details className="mb-4">
        <summary className={`text-sm font-semibold ${colors.textMuted} opacity-60 uppercase tracking-wide cursor-pointer hover:opacity-80 transition-opacity`}>
          Technical Details
        </summary>
        <div className="mt-2 p-3 bg-black/30 rounded-lg border border-white/5">
          <p className="text-sm text-gray-400 font-mono break-all">
            {errorMessage}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Path: {filePath}
          </p>
          {statusCode && (
            <p className="text-xs text-gray-500">
              Status: {statusCode}
            </p>
          )}
        </div>
      </details>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Retry Button */}
        {errorDetails.canRetry && (
          <motion.button
            onClick={onRetry}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 px-4 py-2.5 ${colors.buttonBg} ${colors.buttonBorder} border rounded-lg ${colors.text} font-semibold transition-all shadow-lg`}
            data-testid="file-error-retry-btn"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </motion.button>
        )}

        {/* Switch to Read-Only Button */}
        {errorDetails.canFallbackToReadOnly && onSwitchToReadOnly && operation === 'write' && (
          <motion.button
            onClick={onSwitchToReadOnly}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-300 font-semibold transition-all shadow-lg"
            data-testid="file-error-readonly-btn"
          >
            <Eye className="w-4 h-4" />
            View Read-Only
          </motion.button>
        )}

        {/* Discard Changes Button */}
        {hasUnsavedChanges && onDiscardChanges && (
          <motion.button
            onClick={onDiscardChanges}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/40 rounded-lg text-gray-300 font-semibold transition-all shadow-lg"
            data-testid="file-error-discard-btn"
          >
            <Trash2 className="w-4 h-4" />
            Discard Changes
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
