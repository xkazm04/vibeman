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
  Volume2,
  VolumeX,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import {
  AudioError,
  AudioErrorCode,
  parseAudioError,
  logAudioError,
  getUserFriendlyMessage,
  attemptRecovery,
} from '../lib/audioErrors';
import {
  AnnetteError,
  AnnetteRecoveryAction,
  parseAnnetteError,
  logAnnetteError,
  getSeverityColors,
} from '../lib/annetteErrors';
import { logErrorTelemetry } from '../lib/analyticsService';

// ============================================================================
// TYPES
// ============================================================================

/** Discriminated union of error types */
export type AnnetteErrorType =
  | { type: 'audio'; error: AudioError }
  | { type: 'service'; error: AnnetteError };

/** Severity level type shared across error types */
type ErrorSeverity = 'warning' | 'error' | 'critical';

/** Actions available from error boundary */
export interface ErrorBoundaryActions {
  retry: () => void;
  clearError: () => void;
  handleRecoveryAction?: (action: AnnetteRecoveryAction) => void;
  attemptRecovery?: () => Promise<void>;
}

/** Props for the unified error boundary */
export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Error type to handle: 'audio' for Web Audio errors, 'service' for Annette service errors */
  errorType: 'audio' | 'service';
  /** Project ID for telemetry (service errors only) */
  projectId?: string | null;
  /** Audio context for recovery attempts (audio errors only) */
  audioContext?: AudioContext | null;
  /** Show developer details in console */
  showDevDetails?: boolean;
  /** Custom fallback render function */
  fallback?: (errorData: AnnetteErrorType, actions: ErrorBoundaryActions) => ReactNode;
  /** Callback when an error occurs */
  onError?: (errorData: AnnetteErrorType) => void;
  /** Callback when recovery is attempted (audio errors only) */
  onRecoveryAttempt?: (error: AudioError, success: boolean) => void;
  /** Callback when recovery action is triggered (service errors only) */
  onRecoveryAction?: (action: AnnetteRecoveryAction, error: AnnetteError) => void;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Callback for switch provider action (service errors only) */
  onSwitchProvider?: () => void;
  /** Callback for clear cache action (service errors only) */
  onClearCache?: () => void;
  /** Callback for clear sessions action (service errors only) */
  onClearSessions?: () => void;
  /** Callback for open settings action (service errors only) */
  onOpenSettings?: () => void;
}

interface ErrorBoundaryState {
  /** Current error data if any */
  errorData: AnnetteErrorType | null;
  /** Whether recovery is in progress */
  isRecovering: boolean;
  /** Number of retry attempts */
  retryCount: number;
  /** Whether details panel is expanded */
  showDetails: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
function getSeverityIcon(severity: ErrorSeverity, errorType: 'audio' | 'service'): ReactNode {
  switch (severity) {
    case 'critical':
      return errorType === 'audio'
        ? <VolumeX className="w-6 h-6 text-red-400" />
        : <AlertTriangle className="w-6 h-6 text-red-400" />;
    case 'error':
      return errorType === 'audio'
        ? <AlertTriangle className="w-6 h-6 text-orange-400" />
        : <AlertTriangle className="w-6 h-6 text-orange-400" />;
    case 'warning':
      return errorType === 'audio'
        ? <Volume2 className="w-6 h-6 text-yellow-400" />
        : <Sparkles className="w-6 h-6 text-yellow-400" />;
    default:
      return <AlertTriangle className="w-6 h-6 text-gray-400" />;
  }
}

/**
 * Get severity color classes for audio errors
 */
function getAudioSeverityColors(severity: ErrorSeverity): string {
  switch (severity) {
    case 'critical':
      return 'border-red-500/50 bg-red-950/30';
    case 'error':
      return 'border-orange-500/50 bg-orange-950/30';
    case 'warning':
      return 'border-yellow-500/50 bg-yellow-950/30';
    default:
      return 'border-gray-500/50 bg-gray-950/30';
  }
}

/**
 * Get original error message as string
 */
function getOriginalErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

/**
 * Unified Error Boundary for Annette Subsystem
 *
 * Handles both Web Audio API failures and service errors, providing:
 * - Typed error codes for programmatic handling
 * - Developer-friendly recovery guidance
 * - User-friendly error messages
 * - Automatic recovery attempts where possible
 *
 * @example
 * ```tsx
 * // For audio errors
 * <ErrorBoundary
 *   errorType="audio"
 *   audioContext={audioContext}
 *   onError={(data) => console.log('Audio error:', data.error.code)}
 * >
 *   <VoiceVisualizer ... />
 * </ErrorBoundary>
 *
 * // For service errors
 * <ErrorBoundary
 *   errorType="service"
 *   projectId={projectId}
 *   onError={(data) => console.log('Service error:', data.error.code)}
 *   onRetry={handleRetry}
 *   onSwitchProvider={handleSwitchProvider}
 * >
 *   <AnnettePanelContent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      errorData: null,
      isRecovering: false,
      retryCount: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // We'll determine the type in componentDidCatch
    // For now, just mark that we have an error
    return {};
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { errorType, projectId, showDevDetails } = this.props;

    let errorData: AnnetteErrorType;

    if (errorType === 'audio') {
      const audioError = parseAudioError(error);
      errorData = { type: 'audio', error: audioError };
      logAudioError(audioError);

      if (showDevDetails !== false) {
        console.log('[Annette Audio] Component Stack:', errorInfo.componentStack);
      }
    } else {
      const annetteError = parseAnnetteError(error);
      errorData = { type: 'service', error: annetteError };
      logAnnetteError(annetteError);
      console.log('[Annette] Component Stack:', errorInfo.componentStack);

      // Log to telemetry
      if (projectId) {
        logErrorTelemetry({
          projectId,
          errorCode: annetteError.code,
          errorMessage: annetteError.message,
          severity: annetteError.severity,
          recoverable: annetteError.autoRecoverable,
          context: 'error_boundary',
          stack: errorInfo.componentStack,
        });
      }
    }

    this.setState({ errorData });
    this.props.onError?.(errorData);
  }

  /**
   * Handle non-Error errors (for use with try/catch in children)
   */
  handleError = (error: Error | unknown): void => {
    const { errorType, projectId } = this.props;

    let errorData: AnnetteErrorType;

    if (errorType === 'audio') {
      const audioError = parseAudioError(error);
      errorData = { type: 'audio', error: audioError };
      logAudioError(audioError);
    } else {
      const annetteError = parseAnnetteError(error);
      errorData = { type: 'service', error: annetteError };
      logAnnetteError(annetteError);

      if (projectId) {
        logErrorTelemetry({
          projectId,
          errorCode: annetteError.code,
          errorMessage: annetteError.message,
          severity: annetteError.severity,
          recoverable: annetteError.autoRecoverable,
          context: 'service_error',
        });
      }
    }

    this.setState({ errorData });
    this.props.onError?.(errorData);
  };

  /**
   * Attempt to recover from audio errors
   */
  attemptAudioRecovery = async (): Promise<void> => {
    const { errorData } = this.state;
    const { audioContext, onRecoveryAttempt } = this.props;

    if (!errorData || errorData.type !== 'audio') return;

    this.setState({ isRecovering: true });

    try {
      const success = await attemptRecovery(errorData.error, audioContext ?? null);
      onRecoveryAttempt?.(errorData.error, success);

      if (success) {
        this.setState({
          errorData: null,
          isRecovering: false,
          retryCount: 0,
        });
      } else {
        this.setState(prev => ({
          isRecovering: false,
          retryCount: prev.retryCount + 1,
        }));
      }
    } catch {
      this.setState(prev => ({
        isRecovering: false,
        retryCount: prev.retryCount + 1,
      }));
    }
  };

  /**
   * Handle a service recovery action button click
   */
  handleServiceRecoveryAction = async (action: AnnetteRecoveryAction): Promise<void> => {
    const { errorData } = this.state;
    if (!errorData || errorData.type !== 'service') return;

    this.setState({ isRecovering: true });

    try {
      this.props.onRecoveryAction?.(action, errorData.error);

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
   * Clear error state and retry
   */
  retry = (): void => {
    this.setState(prev => ({
      errorData: null,
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
      errorData: null,
      retryCount: 0,
      showDetails: false,
    });
  };

  /**
   * Toggle developer details panel
   */
  toggleDetails = (): void => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  /**
   * Render audio error UI
   */
  renderAudioErrorUI(audioError: AudioError): ReactNode {
    const { isRecovering, retryCount, showDetails } = this.state;
    const userMessage = getUserFriendlyMessage(audioError.code);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-xl border ${getAudioSeverityColors(audioError.severity)} p-4`}
        data-testid="annette-error-boundary"
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          {getSeverityIcon(audioError.severity, 'audio')}

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm" data-testid="annette-error-title">
              {userMessage}
            </h3>
            <p className="text-gray-400 text-xs mt-1 font-mono" data-testid="annette-error-code">
              {audioError.code}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {audioError.recoverable && (
              <motion.button
                onClick={this.attemptAudioRecovery}
                disabled={isRecovering}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Attempt Recovery"
                data-testid="annette-error-recover-btn"
              >
                <RefreshCw className={`w-4 h-4 text-white ${isRecovering ? 'animate-spin' : ''}`} />
              </motion.button>
            )}

            <motion.button
              onClick={this.toggleDetails}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Developer Details"
              data-testid="annette-error-details-btn"
            >
              {showDetails ? (
                <ChevronUp className="w-4 h-4 text-white" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Developer Details Panel */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 text-xs font-medium uppercase tracking-wider">
                    Developer Recovery Guidance
                  </span>
                </div>

                <div className="bg-black/30 rounded-lg p-3 font-mono text-xs">
                  <p className="text-gray-300 leading-relaxed" data-testid="annette-error-recovery">
                    {audioError.recovery}
                  </p>

                  {audioError.originalError != null && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-gray-500 mb-1">Original Error:</p>
                      <p className="text-red-400 break-all">
                        {getOriginalErrorMessage(audioError.originalError)}
                      </p>
                    </div>
                  )}

                  {retryCount > 0 && (
                    <p className="mt-2 text-yellow-400">
                      Recovery attempts: {retryCount}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Retry Button */}
        {!audioError.recoverable && (
          <motion.button
            onClick={this.retry}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-4 w-full py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
            data-testid="annette-error-retry-btn"
          >
            Retry
          </motion.button>
        )}
      </motion.div>
    );
  }

  /**
   * Render service error UI
   */
  renderServiceErrorUI(serviceError: AnnetteError): ReactNode {
    const { isRecovering, retryCount, showDetails } = this.state;
    const colors = getSeverityColors(serviceError.severity);

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
              {getSeverityIcon(serviceError.severity, 'service')}

              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium text-lg" data-testid="annette-error-title">
                  {serviceError.message}
                </h3>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed" data-testid="annette-error-recovery">
                  {serviceError.recovery}
                </p>
                <p className={`text-xs font-mono mt-2 ${colors.text} opacity-70`} data-testid="annette-error-code">
                  {serviceError.code}
                </p>
              </div>
            </div>

            {/* Recovery Actions */}
            {serviceError.recoveryActions.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-6">
                {serviceError.recoveryActions.map((action) => (
                  <motion.button
                    key={action.id}
                    onClick={() => this.handleServiceRecoveryAction(action)}
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
                        <span className={`ml-2 ${colors.text}`}>{serviceError.code}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Severity:</span>
                        <span className={`ml-2 ${colors.text}`}>{serviceError.severity}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Auto-recoverable:</span>
                        <span className="ml-2 text-gray-300">{serviceError.autoRecoverable ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Timestamp:</span>
                        <span className="ml-2 text-gray-300">{serviceError.timestamp.toISOString()}</span>
                      </div>
                      {retryCount > 0 && (
                        <div>
                          <span className="text-gray-500">Retry attempts:</span>
                          <span className="ml-2 text-yellow-400">{retryCount}</span>
                        </div>
                      )}
                      {serviceError.originalError != null && (
                        <div className="pt-3 border-t border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Info className="w-4 h-4 text-cyan-400" />
                            <span className="text-cyan-400">Original Error:</span>
                          </div>
                          <p className="text-red-400 break-all leading-relaxed">
                            {getOriginalErrorMessage(serviceError.originalError)}
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

  render(): ReactNode {
    const { errorData } = this.state;
    const { children, fallback } = this.props;

    // If there's an error and a custom fallback is provided
    if (errorData && fallback) {
      const actions: ErrorBoundaryActions = {
        retry: this.retry,
        clearError: this.clearError,
        handleRecoveryAction: errorData.type === 'service'
          ? this.handleServiceRecoveryAction
          : undefined,
        attemptRecovery: errorData.type === 'audio'
          ? this.attemptAudioRecovery
          : undefined,
      };
      return fallback(errorData, actions);
    }

    // Render appropriate error UI based on type
    if (errorData) {
      if (errorData.type === 'audio') {
        return this.renderAudioErrorUI(errorData.error);
      } else {
        return this.renderServiceErrorUI(errorData.error);
      }
    }

    // Render children normally when there's no error
    return children;
  }
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to access audio error handling from functional components
 */
export function useAudioErrorHandler() {
  const handleError = React.useCallback((error: Error | unknown): AudioError => {
    const audioError = parseAudioError(error);
    logAudioError(audioError);
    return audioError;
  }, []);

  return { handleError };
}

/**
 * Hook to access Annette service error handling from functional components
 */
export function useAnnetteErrorHandler() {
  const handleError = React.useCallback((error: Error | unknown): AnnetteError => {
    const annetteError = parseAnnetteError(error);
    logAnnetteError(annetteError);
    return annetteError;
  }, []);

  return { handleError };
}

export default ErrorBoundary;
