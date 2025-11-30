/**
 * Centralized Adapter Error Types
 *
 * Provides structured error types for scan adapters with consistent
 * error messages, categorization, and recovery suggestions.
 */

/**
 * Error severity levels that map to user-facing messaging
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Error categories for classification and handling
 */
export enum AdapterErrorCategory {
  /** Network/API communication failures */
  NETWORK = 'NETWORK',
  /** Request/response timeout */
  TIMEOUT = 'TIMEOUT',
  /** Invalid input or configuration */
  VALIDATION = 'VALIDATION',
  /** External service/API errors */
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  /** Internal adapter logic errors */
  INTERNAL = 'INTERNAL',
  /** Resource not found */
  NOT_FOUND = 'NOT_FOUND',
  /** Permission/authorization issues */
  PERMISSION = 'PERMISSION',
  /** Rate limiting */
  RATE_LIMIT = 'RATE_LIMIT',
  /** Unknown/uncategorized errors */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Recovery action suggestions for error resolution
 */
export interface RecoveryAction {
  /** Short action label */
  label: string;
  /** Detailed description of the action */
  description: string;
  /** Action type for handling */
  type: 'retry' | 'configure' | 'manual' | 'skip' | 'fallback';
}

/**
 * Base adapter error with rich context for debugging and user feedback
 */
export class AdapterError extends Error {
  /** Unique error code for tracking */
  public readonly code: string;
  /** Error category for classification */
  public readonly category: AdapterErrorCategory;
  /** Severity level for UI presentation */
  public readonly severity: ErrorSeverity;
  /** Whether this error is retryable */
  public readonly retryable: boolean;
  /** Suggested recovery actions */
  public readonly recoveryActions: RecoveryAction[];
  /** User-friendly message */
  public readonly userMessage: string;
  /** Technical details for debugging */
  public readonly technicalDetails?: string;
  /** Original error if wrapped */
  public readonly originalError?: Error;
  /** Adapter ID that generated the error */
  public readonly adapterId?: string;
  /** Timestamp when error occurred */
  public readonly timestamp: Date;

  constructor(params: {
    message: string;
    code: string;
    category: AdapterErrorCategory;
    severity?: ErrorSeverity;
    retryable?: boolean;
    recoveryActions?: RecoveryAction[];
    userMessage?: string;
    technicalDetails?: string;
    originalError?: Error;
    adapterId?: string;
  }) {
    super(params.message);
    this.name = 'AdapterError';
    this.code = params.code;
    this.category = params.category;
    this.severity = params.severity ?? 'error';
    this.retryable = params.retryable ?? false;
    this.recoveryActions = params.recoveryActions ?? [];
    this.userMessage = params.userMessage ?? params.message;
    this.technicalDetails = params.technicalDetails;
    this.originalError = params.originalError;
    this.adapterId = params.adapterId;
    this.timestamp = new Date();

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AdapterError.prototype);
  }

  /**
   * Format error for logging
   */
  toLogString(): string {
    return `[${this.code}] ${this.category}: ${this.message}${
      this.technicalDetails ? ` | Details: ${this.technicalDetails}` : ''
    }`;
  }

  /**
   * Format error for JSON serialization
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      severity: this.severity,
      message: this.message,
      userMessage: this.userMessage,
      retryable: this.retryable,
      recoveryActions: this.recoveryActions,
      technicalDetails: this.technicalDetails,
      adapterId: this.adapterId,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Network-related errors (connection failures, DNS issues, etc.)
 */
export class NetworkError extends AdapterError {
  constructor(params: {
    message: string;
    url?: string;
    originalError?: Error;
    adapterId?: string;
  }) {
    super({
      message: params.message,
      code: 'ADAPTER_NETWORK_ERROR',
      category: AdapterErrorCategory.NETWORK,
      severity: 'error',
      retryable: true,
      userMessage: 'Unable to connect to the server. Please check your network connection.',
      technicalDetails: params.url ? `Failed URL: ${params.url}` : undefined,
      originalError: params.originalError,
      adapterId: params.adapterId,
      recoveryActions: [
        {
          label: 'Retry',
          description: 'Attempt the operation again',
          type: 'retry',
        },
        {
          label: 'Check Connection',
          description: 'Verify your network connection and try again',
          type: 'manual',
        },
      ],
    });
    this.name = 'NetworkError';
  }
}

/**
 * Timeout errors for long-running operations
 */
export class TimeoutError extends AdapterError {
  public readonly timeoutMs: number;

  constructor(params: {
    message: string;
    timeoutMs: number;
    operation?: string;
    adapterId?: string;
  }) {
    super({
      message: params.message,
      code: 'ADAPTER_TIMEOUT',
      category: AdapterErrorCategory.TIMEOUT,
      severity: 'warning',
      retryable: true,
      userMessage: `Operation timed out after ${params.timeoutMs / 1000} seconds. The operation may still be running.`,
      technicalDetails: params.operation ? `Operation: ${params.operation}` : undefined,
      adapterId: params.adapterId,
      recoveryActions: [
        {
          label: 'Retry',
          description: 'Try the operation again with the same timeout',
          type: 'retry',
        },
        {
          label: 'Skip',
          description: 'Skip this operation and continue',
          type: 'skip',
        },
      ],
    });
    this.name = 'TimeoutError';
    this.timeoutMs = params.timeoutMs;
  }
}

/**
 * Validation errors for invalid input or configuration
 */
export class ValidationError extends AdapterError {
  public readonly field?: string;
  public readonly validationErrors: string[];

  constructor(params: {
    message: string;
    field?: string;
    validationErrors?: string[];
    adapterId?: string;
  }) {
    const errors = params.validationErrors ?? [params.message];
    super({
      message: params.message,
      code: 'ADAPTER_VALIDATION_ERROR',
      category: AdapterErrorCategory.VALIDATION,
      severity: 'warning',
      retryable: false,
      userMessage: `Invalid configuration: ${errors.join(', ')}`,
      technicalDetails: params.field ? `Field: ${params.field}` : undefined,
      adapterId: params.adapterId,
      recoveryActions: [
        {
          label: 'Fix Configuration',
          description: 'Update the configuration and try again',
          type: 'configure',
        },
      ],
    });
    this.name = 'ValidationError';
    this.field = params.field;
    this.validationErrors = errors;
  }
}

/**
 * External service errors (API failures, third-party service issues)
 */
export class ExternalServiceError extends AdapterError {
  public readonly serviceName: string;
  public readonly statusCode?: number;

  constructor(params: {
    message: string;
    serviceName: string;
    statusCode?: number;
    originalError?: Error;
    adapterId?: string;
  }) {
    const isServerError = params.statusCode !== undefined && params.statusCode >= 500;
    super({
      message: params.message,
      code: 'ADAPTER_EXTERNAL_SERVICE_ERROR',
      category: AdapterErrorCategory.EXTERNAL_SERVICE,
      severity: isServerError ? 'error' : 'warning',
      retryable: isServerError,
      userMessage: `${params.serviceName} service error: ${params.message}`,
      technicalDetails: params.statusCode ? `HTTP ${params.statusCode}` : undefined,
      originalError: params.originalError,
      adapterId: params.adapterId,
      recoveryActions: [
        {
          label: 'Retry',
          description: 'The service may have recovered, try again',
          type: 'retry',
        },
        {
          label: 'Use Fallback',
          description: 'Try an alternative approach',
          type: 'fallback',
        },
      ],
    });
    this.name = 'ExternalServiceError';
    this.serviceName = params.serviceName;
    this.statusCode = params.statusCode;
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends AdapterError {
  public readonly retryAfterMs?: number;

  constructor(params: {
    message: string;
    retryAfterMs?: number;
    serviceName?: string;
    adapterId?: string;
  }) {
    super({
      message: params.message,
      code: 'ADAPTER_RATE_LIMIT',
      category: AdapterErrorCategory.RATE_LIMIT,
      severity: 'warning',
      retryable: true,
      userMessage: params.retryAfterMs
        ? `Rate limit reached. Please wait ${Math.ceil(params.retryAfterMs / 1000)} seconds before retrying.`
        : 'Rate limit reached. Please wait before retrying.',
      technicalDetails: params.serviceName ? `Service: ${params.serviceName}` : undefined,
      adapterId: params.adapterId,
      recoveryActions: [
        {
          label: 'Wait and Retry',
          description: 'Wait for the rate limit to reset and try again',
          type: 'retry',
        },
      ],
    });
    this.name = 'RateLimitError';
    this.retryAfterMs = params.retryAfterMs;
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AdapterError {
  public readonly resourceType: string;
  public readonly resourceId?: string;

  constructor(params: {
    message: string;
    resourceType: string;
    resourceId?: string;
    adapterId?: string;
  }) {
    super({
      message: params.message,
      code: 'ADAPTER_NOT_FOUND',
      category: AdapterErrorCategory.NOT_FOUND,
      severity: 'warning',
      retryable: false,
      userMessage: `${params.resourceType} not found${params.resourceId ? `: ${params.resourceId}` : ''}`,
      technicalDetails: `Resource: ${params.resourceType}${params.resourceId ? ` (${params.resourceId})` : ''}`,
      adapterId: params.adapterId,
      recoveryActions: [
        {
          label: 'Skip',
          description: 'Skip this resource and continue',
          type: 'skip',
        },
        {
          label: 'Create Resource',
          description: 'Create the missing resource',
          type: 'manual',
        },
      ],
    });
    this.name = 'NotFoundError';
    this.resourceType = params.resourceType;
    this.resourceId = params.resourceId;
  }
}

/**
 * Permission/authorization errors
 */
export class PermissionError extends AdapterError {
  public readonly requiredPermission?: string;

  constructor(params: {
    message: string;
    requiredPermission?: string;
    adapterId?: string;
  }) {
    super({
      message: params.message,
      code: 'ADAPTER_PERMISSION_ERROR',
      category: AdapterErrorCategory.PERMISSION,
      severity: 'error',
      retryable: false,
      userMessage: 'Permission denied. Please check your access rights.',
      technicalDetails: params.requiredPermission
        ? `Required permission: ${params.requiredPermission}`
        : undefined,
      adapterId: params.adapterId,
      recoveryActions: [
        {
          label: 'Configure Access',
          description: 'Update your credentials or permissions',
          type: 'configure',
        },
      ],
    });
    this.name = 'PermissionError';
    this.requiredPermission = params.requiredPermission;
  }
}

/**
 * Check if an error is an AdapterError
 */
export function isAdapterError(error: unknown): error is AdapterError {
  return error instanceof AdapterError;
}

/**
 * Convert any error to an AdapterError
 */
export function toAdapterError(
  error: unknown,
  adapterId?: string
): AdapterError {
  if (isAdapterError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Check for common error patterns
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('econnrefused')) {
      return new NetworkError({
        message: error.message,
        originalError: error,
        adapterId,
      });
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return new TimeoutError({
        message: error.message,
        timeoutMs: 0,
        adapterId,
      });
    }

    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return new PermissionError({
        message: error.message,
        adapterId,
      });
    }

    if (message.includes('not found') || message.includes('404')) {
      return new NotFoundError({
        message: error.message,
        resourceType: 'Resource',
        adapterId,
      });
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return new RateLimitError({
        message: error.message,
        adapterId,
      });
    }

    return new AdapterError({
      message: error.message,
      code: 'ADAPTER_UNKNOWN_ERROR',
      category: AdapterErrorCategory.UNKNOWN,
      severity: 'error',
      retryable: false,
      originalError: error,
      adapterId,
    });
  }

  // Handle non-Error values
  return new AdapterError({
    message: String(error),
    code: 'ADAPTER_UNKNOWN_ERROR',
    category: AdapterErrorCategory.UNKNOWN,
    severity: 'error',
    retryable: false,
    adapterId,
  });
}
