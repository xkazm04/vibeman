'use client';

import React, { Component, ReactNode } from 'react';

/**
 * Error information passed to the onError callback
 */
export interface IntegrationError {
  integration: string;
  operation: string;
  error: Error;
  context: Record<string, unknown>;
  timestamp: Date;
}

export interface IntegrationErrorBoundaryProps {
  /** Content to render when no error occurs */
  children: ReactNode;
  /** Optional fallback to render on error. Defaults to null (hide component) */
  fallback?: ReactNode;
  /** Optional callback invoked when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Integration name for logging context */
  integrationName?: string;
}

interface IntegrationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for graceful degradation of integrated modules.
 * 
 * Unlike the full ErrorBoundary, this component:
 * - Defaults to hiding the component on error (fallback = null)
 * - Is lightweight with no UI dependencies
 * - Designed for wrapping integrated components that should fail silently
 * 
 * @example
 * ```tsx
 * <IntegrationErrorBoundary
 *   integrationName="suggestion"
 *   onError={(error) => console.error('Integration failed:', error)}
 * >
 *   <SuggestionPanel />
 * </IntegrationErrorBoundary>
 * ```
 */
export class IntegrationErrorBoundary extends Component<
  IntegrationErrorBoundaryProps,
  IntegrationErrorBoundaryState
> {
  constructor(props: IntegrationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): IntegrationErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { onError, integrationName } = this.props;

    // Log the error with integration context
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[IntegrationErrorBoundary${integrationName ? `:${integrationName}` : ''}] Error caught:`,
        error,
        errorInfo
      );
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }
  }

  render(): ReactNode {
    const { hasError } = this.state;
    const { children, fallback = null } = this.props;

    if (hasError) {
      return fallback;
    }

    return children;
  }
}

export default IntegrationErrorBoundary;
