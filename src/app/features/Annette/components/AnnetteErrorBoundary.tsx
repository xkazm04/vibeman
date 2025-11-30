'use client';

import React, { Component, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  RefreshCw,
  Settings,
  Trash2,
  Wifi,
  Key,
  Database,
  Power,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  AnnetteError,
  AnnetteRecoveryAction,
  parseAnnetteError,
  logAnnetteError,
  getSeverityColors,
} from '../lib/annetteErrors';
import { logErrorTelemetry } from '../lib/analyticsService';

interface AnnetteErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Project ID for telemetry */
  projectId?: string | null;
  /** Custom fallback render function */
  fallback?: (error: AnnetteError, actions: ErrorBoundaryActions) => ReactNode;
  /** Callback when an error occurs */
  onError?: (error: AnnetteError) => void;
  /** Callback when recovery action is triggered */
  onRecoveryAction?: (action: AnnetteRecoveryAction, error: AnnetteError) => void;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Callback for switch provider action */
  onSwitchProvider?: () => void;
  /** Callback for clear cache action */
  onClearCache?: () => void;
  /** Callback for clear sessions action */
  onClearSessions?: () => void;
  /** Callback for open settings action */
  onOpenSettings?: () => void;
}

interface AnnetteErrorBoundaryState {
  /** Current error if any */
  error: AnnetteError | null;
  /** Whether recovery is in progress */
  isRecovering: boolean;
  /** Number of retry attempts */
  retryCount: number;
  /** Whether details panel is expanded */
  showDetails: boolean;
}

export interface ErrorBoundaryActions {
  retry: () => void;
  clearError: () => void;
  handleRecoveryAction: (action: AnnetteRecoveryAction) => void;
}

/**
 * Get icon component for recovery action
 */
function getActionIcon(icon: AnnetteRecoveryAction['icon']): ReactNode {
  const iconProps = { className: 'w-4 h-4' };
  switch (icon) {
    case 'refresh-cw': return <RefreshCw {...iconProps} />;
    case 'settings': return <Settings {...iconProps} />;
    case 'trash-2': return <Trash2 {...iconProps} />;
    case 'wifi': return <Wifi {...iconProps} />;
    case 'key': return <Key {...iconProps} />;
    case 'database': return <Database {...iconProps} />;
    case 'power': return <Power {...iconProps} />;
    default: return <RefreshCw {...iconProps} />;
  }
}

/**
 * Get severity icon component
 */
function getSeverityIcon(severity: AnnetteError['severity']): ReactNode {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="w-6 h-6 text-red-400" />;
    case 'error':
      return <AlertTriangle className="w-6 h-6 text-orange-400" />;
    case 'warning':
      return <Sparkles className="w-6 h-6 text-yellow-400" />;
    default:
      return <AlertTriangle className="w-6 h-6 text-gray-400" />;
  }
}

/**
 * Error Boundary for Annette Service Failures
 *
 * Catches service errors including:
 * - LLM provider unavailable/timeout/auth failures
 * - Knowledge query timeouts
 * - IndexedDB storage issues (quota exceeded, access denied)
 * - Session recovery failures
 *
 * Provides user-friendly error messages with recovery actions.
 */
export class AnnetteErrorBoundary extends Component<AnnetteErrorBoundaryProps, AnnetteErrorBoundaryState> {
  constructor(props: AnnetteErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      isRecovering: false,
      retryCount: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AnnetteErrorBoundaryState> {
    const annetteError = parseAnnetteError(error);
    return { error: annetteError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const annetteError = parseAnnetteError(error);

    // Log to console with developer guidance
    logAnnetteError(annetteError);
    console.log('[Annette] Component Stack:', errorInfo.componentStack);

    // Log to telemetry
    if (this.props.projectId) {
      logErrorTelemetry({
        projectId: this.props.projectId,
        errorCode: annetteError.code,
        errorMessage: annetteError.message,
        severity: annetteError.severity,
        recoverable: annetteError.autoRecoverable,
        context: 'error_boundary',
        stack: errorInfo.componentStack,
      });
    }

    // Notify parent
    this.props.onError?.(annetteError);
  }

  /**
   * Handle non-Error service errors (for use with try/catch in children)
   */
  handleServiceError = (error: Error | unknown): void => {
    const annetteError = parseAnnetteError(error);
    this.setState({ error: annetteError });

    logAnnetteError(annetteError);

    // Log to telemetry
    if (this.props.projectId) {
      logErrorTelemetry({
        projectId: this.props.projectId,
        errorCode: annetteError.code,
        errorMessage: annetteError.message,
        severity: annetteError.severity,
        recoverable: annetteError.autoRecoverable,
        context: 'service_error',
      });
    }

    this.props.onError?.(annetteError);
  };

  /**
   * Clear error state and retry
   */
  retry = (): void => {
    this.setState(prev => ({
      error: null,
      retryCount: prev.retryCount + 1,
      showDetails: false,
    }));
    this.props.onRetry?.();
  };

  /**
   * Clear error state without retrying
   */
  clearError = (): void => {
    this.setState({
      error: null,
      retryCount: 0,
      showDetails: false,
    });
  };

  /**
   * Handle a recovery action button click
   */
  handleRecoveryAction = async (action: AnnetteRecoveryAction): Promise<void> => {
    const { error } = this.state;
    if (!error) return;

    this.setState({ isRecovering: true });

    try {
      // Notify parent of action
      this.props.onRecoveryAction?.(action, error);

      switch (action.type) {
        case 'retry':
          this.retry();
          break;
        case 'switch-provider':
          this.props.onSwitchProvider?.();
          this.clearError();
          break;
        case 'clear-cache':
          this.props.onClearCache?.();
          this.clearError();
          break;
        case 'clear-sessions':
          this.props.onClearSessions?.();
          this.clearError();
          break;
        case 'open-settings':
          this.props.onOpenSettings?.();
          break;
        case 'check-network':
          // Just provide feedback - user needs to check manually
          if (navigator.onLine) {
            this.retry();
          }
          break;
      }
    } finally {
      this.setState({ isRecovering: false });
    }
  };

  /**
   * Toggle developer details panel
   */
  toggleDetails = (): void => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  /**
   * Get original error message as string
   */
  getOriginalErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error';
  };

  render(): ReactNode {
    const { error, isRecovering, retryCount, showDetails } = this.state;
    const { children, fallback } = this.props;

    // If there's an error and a custom fallback is provided
    if (error && fallback) {
      const actions: ErrorBoundaryActions = {
        retry: this.retry,
        clearError: this.clearError,
        handleRecoveryAction: this.handleRecoveryAction,
      };
      return fallback(error, actions);
    }

    // Default error UI
    if (error) {
      const colors = getSeverityColors(error.severity);

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full mx-auto"
          data-testid="annette-error-boundary"
        >
          <div className={`relative flex flex-col rounded-3xl border ${colors.border} ${colors.bg} backdrop-blur-2xl overflow-hidden shadow-2xl shadow-black/50`}>
            {/* Ambient glow effect */}
            <div className={`absolute inset-0 ${colors.bg} opacity-30 blur-3xl pointer-events-none`} />

            {/* Top Glass Highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Header */}
            <div className="relative p-6">
              <div className="flex items-start gap-4">
                {getSeverityIcon(error.severity)}

                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium text-lg" data-testid="annette-error-title">
                    {error.message}
                  </h3>
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed" data-testid="annette-error-recovery">
                    {error.recovery}
                  </p>
                  <p className={`text-xs font-mono mt-2 ${colors.text} opacity-70`} data-testid="annette-error-code">
                    {error.code}
                  </p>
                </div>
              </div>

              {/* Recovery Actions */}
              {error.recoveryActions.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-6">
                  {error.recoveryActions.map((action) => (
                    <motion.button
                      key={action.id}
                      onClick={() => this.handleRecoveryAction(action)}
                      disabled={isRecovering}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        flex items-center gap-2 px-4 py-2.5 rounded-xl
                        bg-white/10 hover:bg-white/20
                        text-white text-sm font-medium
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200
                        border border-white/10 hover:border-white/20
                      `}
                      data-testid={`annette-error-action-${action.id}`}
                    >
                      {isRecovering && action.type === 'retry' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        getActionIcon(action.icon)
                      )}
                      {action.label}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Developer Details Toggle */}
            <div className="border-t border-white/10">
              <button
                onClick={this.toggleDetails}
                className="w-full px-6 py-3 flex items-center justify-between text-gray-500 hover:text-gray-300 transition-colors"
                data-testid="annette-error-details-toggle"
              >
                <span className="text-xs font-mono uppercase tracking-wider">
                  Developer Details
                </span>
                {showDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Developer Details Panel */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      <div className="bg-black/30 rounded-xl p-4 font-mono text-xs space-y-3">
                        <div>
                          <span className="text-gray-500">Error Code:</span>
                          <span className={`ml-2 ${colors.text}`}>{error.code}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Severity:</span>
                          <span className={`ml-2 ${colors.text}`}>{error.severity}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Auto-recoverable:</span>
                          <span className="ml-2 text-gray-300">{error.autoRecoverable ? 'Yes' : 'No'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Timestamp:</span>
                          <span className="ml-2 text-gray-300">{error.timestamp.toISOString()}</span>
                        </div>
                        {retryCount > 0 && (
                          <div>
                            <span className="text-gray-500">Retry attempts:</span>
                            <span className="ml-2 text-yellow-400">{retryCount}</span>
                          </div>
                        )}
                        {error.originalError != null && (
                          <div className="pt-3 border-t border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <Info className="w-4 h-4 text-cyan-400" />
                              <span className="text-cyan-400">Original Error:</span>
                            </div>
                            <p className="text-red-400 break-all leading-relaxed">
                              {this.getOriginalErrorMessage(error.originalError)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      );
    }

    // Render children normally when there's no error
    return children;
  }
}

/**
 * Hook to access Annette error handling from functional components
 */
export function useAnnetteErrorHandler() {
  const handleError = React.useCallback((error: Error | unknown): AnnetteError => {
    const annetteError = parseAnnetteError(error);
    logAnnetteError(annetteError);
    return annetteError;
  }, []);

  return { handleError };
}

export default AnnetteErrorBoundary;
