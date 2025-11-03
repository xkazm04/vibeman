'use client';

import React, { Component, ReactNode } from 'react';
import { ErrorClassifier, ClassifiedError, RecoveryAction } from '@/lib/errorClassifier';
import { AlertTriangle, RefreshCw, Home, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface ErrorActionButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  variant?: 'primary' | 'secondary';
}

function ErrorActionButton({ onClick, icon: Icon, label, variant = 'secondary' }: ErrorActionButtonProps) {
  const className = variant === 'primary'
    ? 'flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-medium transition-all shadow-lg'
    : 'flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all';

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={className}
    >
      <Icon className="w-4 h-4" />
      {label}
    </motion.button>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: ClassifiedError, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  classifiedError: ClassifiedError | null;
}

/**
 * Error Boundary component for catching React errors
 * Uses ErrorClassifier for consistent error handling
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      classifiedError: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const classifiedError = ErrorClassifier.classify(error);

    return {
      hasError: true,
      classifiedError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      classifiedError: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.classifiedError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.classifiedError, this.resetError);
      }

      // Default error UI
      return (
        <DefaultErrorFallback
          error={this.state.classifiedError}
          onReset={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback UI component
 */
interface DefaultErrorFallbackProps {
  error: ClassifiedError;
  onReset: () => void;
}

function DefaultErrorFallback({ error, onReset }: DefaultErrorFallbackProps) {
  const handleAction = (action: RecoveryAction) => {
    switch (action) {
      case RecoveryAction.RETRY:
      case RecoveryAction.RETRY_WITH_BACKOFF:
      case RecoveryAction.REFRESH:
        onReset();
        break;
      case RecoveryAction.LOGIN:
        window.location.href = '/login';
        break;
      case RecoveryAction.CONTACT_SUPPORT:
        // Could open support dialog or navigate to support page
        alert('Please contact support for assistance.');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 shadow-2xl">
          {/* Error Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
          </div>

          {/* Error Type Badge */}
          <div className="flex justify-center mb-4">
            <span className="px-4 py-1 rounded-full bg-red-500/20 text-red-300 text-sm font-medium border border-red-500/30">
              {error.type} Error
            </span>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-300 text-center mb-6">
            {error.userMessage}
          </p>

          {/* Technical Details (collapsible) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-6 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <summary className="cursor-pointer text-gray-400 text-sm font-medium">
                Technical Details
              </summary>
              <div className="mt-3 space-y-2">
                <div className="text-sm text-gray-400">
                  <span className="font-semibold">Type:</span> {error.type}
                </div>
                {error.statusCode && (
                  <div className="text-sm text-gray-400">
                    <span className="font-semibold">Status Code:</span> {error.statusCode}
                  </div>
                )}
                <div className="text-sm text-gray-400">
                  <span className="font-semibold">Message:</span> {error.message}
                </div>
                <div className="text-sm text-gray-400">
                  <span className="font-semibold">Transient:</span> {error.isTransient ? 'Yes' : 'No'}
                </div>
              </div>
            </details>
          )}

          {/* Recovery Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            {(error.recoveryActions.includes(RecoveryAction.RETRY) ||
              error.recoveryActions.includes(RecoveryAction.RETRY_WITH_BACKOFF) ||
              error.recoveryActions.includes(RecoveryAction.REFRESH)) && (
              <ErrorActionButton
                onClick={() => handleAction(RecoveryAction.RETRY)}
                icon={RefreshCw}
                label="Try Again"
                variant="primary"
              />
            )}

            <ErrorActionButton
              onClick={() => window.location.href = '/'}
              icon={Home}
              label="Go Home"
            />

            {error.recoveryActions.includes(RecoveryAction.CONTACT_SUPPORT) && (
              <ErrorActionButton
                onClick={() => handleAction(RecoveryAction.CONTACT_SUPPORT)}
                icon={AlertTriangle}
                label="Contact Support"
              />
            )}
          </div>

          {/* Retry Information */}
          {error.isTransient && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                This appears to be a temporary issue. Retrying might help.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Simpler inline error display component for use within pages
 */
interface InlineErrorDisplayProps {
  error: ClassifiedError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function InlineErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className = '',
}: InlineErrorDisplayProps) {
  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-4 bg-red-500/10 border border-red-500/30 rounded-lg ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-red-300 text-sm font-medium mb-1">
            {error.userMessage}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-red-400/70 text-sm">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {(error.shouldRetry && onRetry) && (
            <button
              onClick={onRetry}
              className="text-red-300 hover:text-red-200 text-sm font-medium underline"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-300 hover:text-red-200 text-sm font-medium"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
