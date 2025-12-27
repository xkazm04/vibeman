'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { motion } from 'framer-motion';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showStack: boolean;
}

/**
 * Global Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs them, and displays a fallback UI instead of crashing.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console
    console.error('Error Boundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  toggleStack = (): void => {
    this.setState((prev) => ({ showStack: !prev.showStack }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showStack } = this.state;
    const { children, fallback, showDetails = true } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg w-full"
          >
            {/* Error Card */}
            <div className="bg-gray-800/80 backdrop-blur-md border border-red-500/30 rounded-2xl p-8 shadow-xl shadow-red-500/10">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-500/20 rounded-full">
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-center text-gray-100 mb-2">
                Something went wrong
              </h1>
              <p className="text-center text-gray-400 mb-6">
                An unexpected error occurred. Try refreshing the page or going back home.
              </p>

              {/* Error Details */}
              {showDetails && error && (
                <div className="mb-6">
                  <div className="bg-red-950/50 border border-red-500/20 rounded-lg p-4">
                    <p className="text-sm font-mono text-red-300 break-words">
                      {error.name}: {error.message}
                    </p>
                  </div>

                  {/* Stack Trace Toggle */}
                  {errorInfo && (
                    <button
                      onClick={this.toggleStack}
                      className="mt-3 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      <Bug className="w-4 h-4" />
                      {showStack ? 'Hide' : 'Show'} component stack
                    </button>
                  )}

                  {/* Stack Trace */}
                  {showStack && errorInfo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 overflow-auto max-h-48"
                    >
                      <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>
            </div>

            {/* Help Text */}
            <p className="text-center text-gray-500 text-sm mt-6">
              If this problem persists, please check the console for more details.
            </p>
          </motion.div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook-friendly wrapper for functional components that need error reset
 */
export function useErrorBoundaryReset(): () => void {
  return () => {
    // This is a placeholder - the actual reset is handled by the ErrorBoundary component
    // For a more sophisticated solution, consider using react-error-boundary
    window.location.reload();
  };
}

export default ErrorBoundary;
