'use client';

import React, { Component, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, Volume2, VolumeX, Info, ChevronDown, ChevronUp } from 'lucide-react';
import {
  AudioError,
  AudioErrorCode,
  parseAudioError,
  logAudioError,
  getUserFriendlyMessage,
  attemptRecovery,
} from '../lib/audioErrors';

interface AudioErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Optional fallback render function */
  fallback?: (error: AudioError, retry: () => void) => ReactNode;
  /** Callback when an error occurs */
  onError?: (error: AudioError) => void;
  /** Callback when recovery is attempted */
  onRecoveryAttempt?: (error: AudioError, success: boolean) => void;
  /** Audio context for recovery attempts */
  audioContext?: AudioContext | null;
  /** Show developer details in console */
  showDevDetails?: boolean;
}

interface AudioErrorBoundaryState {
  /** Current audio error if any */
  audioError: AudioError | null;
  /** Whether recovery is in progress */
  isRecovering: boolean;
  /** Number of retry attempts */
  retryCount: number;
  /** Whether dev details panel is expanded */
  showDetails: boolean;
}

/**
 * Error Boundary for Audio Subsystem
 *
 * Catches Web Audio API failures and provides:
 * - Typed error codes for programmatic handling
 * - Developer-friendly recovery guidance
 * - User-friendly error messages
 * - Automatic recovery attempts where possible
 *
 * @example
 * ```tsx
 * <AudioErrorBoundary
 *   audioContext={audioContext}
 *   onError={(error) => console.log('Audio error:', error.code)}
 * >
 *   <VoiceVisualizer ... />
 * </AudioErrorBoundary>
 * ```
 */
export class AudioErrorBoundary extends Component<AudioErrorBoundaryProps, AudioErrorBoundaryState> {
  constructor(props: AudioErrorBoundaryProps) {
    super(props);
    this.state = {
      audioError: null,
      isRecovering: false,
      retryCount: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AudioErrorBoundaryState> {
    const audioError = parseAudioError(error);
    return { audioError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const audioError = parseAudioError(error);

    // Log to console with developer guidance
    logAudioError(audioError);

    if (this.props.showDevDetails !== false) {
      console.log('[Annette Audio] Component Stack:', errorInfo.componentStack);
    }

    // Notify parent
    this.props.onError?.(audioError);
  }

  /**
   * Handle non-Error audio errors (for use with try/catch in children)
   */
  handleAudioError = (error: Error | unknown): void => {
    const audioError = parseAudioError(error);
    this.setState({ audioError });

    // Log to console with developer guidance
    logAudioError(audioError);

    // Notify parent
    this.props.onError?.(audioError);
  };

  /**
   * Attempt to recover from the current error
   */
  attemptRecovery = async (): Promise<void> => {
    const { audioError } = this.state;
    const { audioContext, onRecoveryAttempt } = this.props;

    if (!audioError) return;

    this.setState({ isRecovering: true });

    try {
      const success = await attemptRecovery(audioError, audioContext ?? null);

      onRecoveryAttempt?.(audioError, success);

      if (success) {
        this.setState({
          audioError: null,
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
   * Reset error state and retry
   */
  retry = (): void => {
    this.setState({
      audioError: null,
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
   * Get icon based on error severity
   */
  getSeverityIcon = (severity: AudioError['severity']): ReactNode => {
    switch (severity) {
      case 'critical':
        return <VolumeX className="w-6 h-6 text-red-400" />;
      case 'error':
        return <AlertTriangle className="w-6 h-6 text-orange-400" />;
      case 'warning':
        return <Volume2 className="w-6 h-6 text-yellow-400" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-gray-400" />;
    }
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

  /**
   * Get severity color classes
   */
  getSeverityColors = (severity: AudioError['severity']): string => {
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
  };

  render(): ReactNode {
    const { audioError, isRecovering, retryCount, showDetails } = this.state;
    const { children, fallback } = this.props;

    // If there's an error and a custom fallback is provided
    if (audioError && fallback) {
      return fallback(audioError, this.retry);
    }

    // Default error UI
    if (audioError) {
      const userMessage = getUserFriendlyMessage(audioError.code);

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-xl border ${this.getSeverityColors(audioError.severity)} p-4`}
          data-testid="audio-error-boundary"
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            {this.getSeverityIcon(audioError.severity)}

            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-sm" data-testid="audio-error-title">
                {userMessage}
              </h3>
              <p className="text-gray-400 text-xs mt-1 font-mono" data-testid="audio-error-code">
                {audioError.code}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {audioError.recoverable && (
                <motion.button
                  onClick={this.attemptRecovery}
                  disabled={isRecovering}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Attempt Recovery"
                  data-testid="audio-error-recover-btn"
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
                data-testid="audio-error-details-btn"
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
                    <p className="text-gray-300 leading-relaxed" data-testid="audio-error-recovery">
                      {audioError.recovery}
                    </p>

                    {audioError.originalError != null && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-gray-500 mb-1">Original Error:</p>
                        <p className="text-red-400 break-all">
                          {this.getOriginalErrorMessage(audioError.originalError)}
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
              data-testid="audio-error-retry-btn"
            >
              Retry
            </motion.button>
          )}
        </motion.div>
      );
    }

    // Render children with error handler context
    return children;
  }
}

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

export default AudioErrorBoundary;
