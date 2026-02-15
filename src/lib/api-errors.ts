/**
 * Centralized API Error Handling System
 *
 * Provides typed error codes, standardized error response shapes,
 * and consistent error handling utilities for all API routes.
 */
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { sanitizeErrorDetails, sanitizeErrorMessage } from '@/lib/api-helpers/errorSanitizer';

/**
 * API Error Codes - Typed enum for all possible API error conditions
 */
export enum ApiErrorCode {
  // Validation Errors (400)
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FIELD_VALUE = 'INVALID_FIELD_VALUE',
  INVALID_ACTION = 'INVALID_ACTION',
  INVALID_FORMAT = 'INVALID_FORMAT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Authentication & Authorization Errors (401, 403)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Resource Errors (404, 409)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Database Errors (500)
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',

  // External Service Errors (502, 503)
  LLM_ERROR = 'LLM_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // File System Errors (500)
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  INVALID_PATH = 'INVALID_PATH',

  // Operation Errors (500)
  OPERATION_FAILED = 'OPERATION_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',

  // Rate Limiting (429)
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}

/**
 * Map error codes to default HTTP status codes
 */
export const ERROR_CODE_STATUS_MAP: Record<ApiErrorCode, number> = {
  // 400 Bad Request
  [ApiErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ApiErrorCode.INVALID_FIELD_VALUE]: 400,
  [ApiErrorCode.INVALID_ACTION]: 400,
  [ApiErrorCode.INVALID_FORMAT]: 400,
  [ApiErrorCode.VALIDATION_ERROR]: 400,

  // 401 Unauthorized
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.INVALID_TOKEN]: 401,

  // 403 Forbidden
  [ApiErrorCode.FORBIDDEN]: 403,

  // 404 Not Found
  [ApiErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ApiErrorCode.FILE_NOT_FOUND]: 404,

  // 409 Conflict
  [ApiErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ApiErrorCode.RESOURCE_CONFLICT]: 409,

  // 429 Too Many Requests
  [ApiErrorCode.RATE_LIMITED]: 429,
  [ApiErrorCode.QUOTA_EXCEEDED]: 429,

  // 500 Internal Server Error
  [ApiErrorCode.DATABASE_ERROR]: 500,
  [ApiErrorCode.DATABASE_CONNECTION_ERROR]: 500,
  [ApiErrorCode.QUERY_ERROR]: 500,
  [ApiErrorCode.FILE_READ_ERROR]: 500,
  [ApiErrorCode.FILE_WRITE_ERROR]: 500,
  [ApiErrorCode.INVALID_PATH]: 400,
  [ApiErrorCode.OPERATION_FAILED]: 500,
  [ApiErrorCode.INTERNAL_ERROR]: 500,
  [ApiErrorCode.UNKNOWN_ERROR]: 500,

  // 502/503 External Service Errors
  [ApiErrorCode.LLM_ERROR]: 502,
  [ApiErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
};

/**
 * Standardized API Error Response Shape
 */
export interface ApiErrorResponse {
  /** Always false for error responses */
  success: false;
  /** Human-readable error message */
  error: string;
  /** Machine-readable error code */
  code: ApiErrorCode;
  /** Optional additional details about the error */
  details?: string | Record<string, unknown>;
  /** Optional field-specific errors for validation */
  fieldErrors?: Record<string, string>;
}

/**
 * Standardized API Success Response Shape
 */
export interface ApiSuccessResponse<T = Record<string, unknown>> {
  /** Always true for success responses */
  success: true;
  /** Optional success message */
  message?: string;
  /** Response data */
  data?: T;
}

/**
 * API Error class for throwing typed errors
 */
export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public details?: string | Record<string, unknown>,
    public fieldErrors?: Record<string, string>,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Get the HTTP status code for this error
   */
  getStatus(): number {
    return this.status ?? ERROR_CODE_STATUS_MAP[this.code];
  }

  /**
   * Convert to API error response
   */
  toResponse(): ApiErrorResponse {
    return {
      success: false,
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
      ...(this.fieldErrors && { fieldErrors: this.fieldErrors }),
    };
  }
}

/**
 * Create an API error response with consistent structure
 */
export function createApiErrorResponse(
  code: ApiErrorCode,
  message: string,
  options?: {
    details?: string | Record<string, unknown>;
    fieldErrors?: Record<string, string>;
    status?: number;
    logError?: boolean;
    logContext?: Record<string, unknown>;
  }
): NextResponse<ApiErrorResponse> {
  const status = options?.status ?? ERROR_CODE_STATUS_MAP[code];

  // Log error if requested (default: true for 5xx errors)
  const shouldLog = options?.logError ?? status >= 500;
  if (shouldLog) {
    logger.error(`API Error [${code}]: ${message}`, {
      code,
      status,
      details: options?.details,
      ...options?.logContext,
    });
  }

  // Sanitize details to prevent leaking stack traces, file paths, SQL, etc.
  const safeDetails = sanitizeErrorDetails(options?.details);

  const response: ApiErrorResponse = {
    success: false,
    error: sanitizeErrorMessage(message),
    code,
    ...(safeDetails && { details: safeDetails }),
    ...(options?.fieldErrors && { fieldErrors: options.fieldErrors }),
  };

  return NextResponse.json(response, { status });
}

/**
 * Create a success response with consistent structure
 */
export function createApiSuccessResponse<T = Record<string, unknown>>(
  data?: T,
  options?: {
    message?: string;
    status?: number;
  }
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    ...(options?.message && { message: options.message }),
    ...(data !== undefined && { data }),
  };

  return NextResponse.json(response, { status: options?.status ?? 200 });
}

/**
 * Validate required fields and return error response if missing
 */
export function validateRequiredFields(
  params: Record<string, unknown>,
  required: string[]
): NextResponse<ApiErrorResponse> | null {
  const missing = required.filter(key => {
    const value = params[key];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    const fieldErrors = missing.reduce((acc, field) => {
      acc[field] = `${field} is required`;
      return acc;
    }, {} as Record<string, string>);

    return createApiErrorResponse(
      ApiErrorCode.MISSING_REQUIRED_FIELD,
      `Missing required fields: ${missing.join(', ')}`,
      {
        fieldErrors,
        logError: false, // Don't log validation errors
      }
    );
  }

  return null;
}

/**
 * Handle errors consistently and return appropriate API error response
 */
export function handleApiError(
  error: unknown,
  operation: string,
  defaultCode: ApiErrorCode = ApiErrorCode.INTERNAL_ERROR
): NextResponse<ApiErrorResponse> {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return NextResponse.json(error.toResponse(), { status: error.getStatus() });
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Log full stack trace server-side only; never send to client
    logger.error(`[handleApiError] ${operation}: ${error.message}`, {
      stack: error.stack,
      operation,
    });
    return createApiErrorResponse(
      defaultCode,
      'An internal error occurred',
      {
        logError: false, // Already logged above
        logContext: { operation },
      }
    );
  }

  // Handle unknown errors
  logger.error(`[handleApiError] ${operation}: Unknown error`, {
    error: String(error),
    operation,
  });
  return createApiErrorResponse(
    ApiErrorCode.UNKNOWN_ERROR,
    'An internal error occurred',
    {
      logError: false, // Already logged above
      logContext: { operation },
    }
  );
}

/**
 * Create a not found error response
 */
export function notFoundError(resource: string): NextResponse<ApiErrorResponse> {
  return createApiErrorResponse(
    ApiErrorCode.RESOURCE_NOT_FOUND,
    `${resource} not found`,
    { logError: false }
  );
}

/**
 * Create a database error response
 */
export function databaseError(
  message: string,
  details?: string | Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  // Log raw details server-side; client gets generic message
  if (details) {
    logger.error(`[databaseError] ${message}`, { details });
  }
  return createApiErrorResponse(
    ApiErrorCode.DATABASE_ERROR,
    'A database error occurred',
    { logError: false } // Already logged above
  );
}

/**
 * Create a validation error response
 */
export function validationError(
  message: string,
  fieldErrors?: Record<string, string>
): NextResponse<ApiErrorResponse> {
  return createApiErrorResponse(
    ApiErrorCode.VALIDATION_ERROR,
    message,
    { fieldErrors, logError: false }
  );
}

/**
 * Create an invalid action error response
 */
export function invalidActionError(action: string): NextResponse<ApiErrorResponse> {
  return createApiErrorResponse(
    ApiErrorCode.INVALID_ACTION,
    `Invalid action: ${action}`,
    { logError: false }
  );
}

/**
 * Create an operation failed error response
 */
export function operationFailedError(
  operation: string,
  details?: string | Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  // Log raw details server-side; client gets sanitized operation name only
  if (details) {
    logger.error(`[operationFailedError] ${operation}`, { details });
  }
  return createApiErrorResponse(
    ApiErrorCode.OPERATION_FAILED,
    `${operation} failed`,
    { logError: false } // Already logged above
  );
}

/**
 * Handle operation result and return appropriate response
 * @param result - Operation result with success flag
 * @param successMessage - Message to include on success
 * @param errorMessage - Fallback error message if result.error is not set (optional, for backward compat)
 */
export function handleOperationResult<T extends Record<string, unknown>>(
  result: { success: boolean; error?: string } & T,
  successMessage?: string,
  errorMessage?: string
): NextResponse {
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || errorMessage || 'Operation failed' },
      { status: 500 }
    );
  }

  // Spread result at root level for backward compatibility (original behavior)
  // Note: result already includes success: true, so we just spread it
  return NextResponse.json({
    ...(successMessage && { message: successMessage }),
    ...result,
  });
}

// Re-export legacy function names for backward compatibility
// These should be gradually migrated to the new functions

/** @deprecated Use createApiErrorResponse instead */
export const createErrorResponse = (message: string, status: number) =>
  createApiErrorResponse(
    status === 404 ? ApiErrorCode.RESOURCE_NOT_FOUND :
    status === 400 ? ApiErrorCode.VALIDATION_ERROR :
    ApiErrorCode.INTERNAL_ERROR,
    message,
    { status, logError: status >= 500 }
  );

/** @deprecated Use handleApiError instead */
export const handleError = (error: unknown, operation: string) =>
  handleApiError(error, operation);

/** @deprecated Use notFoundError instead */
export const notFoundResponse = (resource: string) => notFoundError(resource);

/** @deprecated Use validateRequiredFields instead */
export const validateRequired = (params: Record<string, unknown>, required: string[]) =>
  validateRequiredFields(params, required);

/** @deprecated Use createApiSuccessResponse instead */
export const successResponse = (data: Record<string, unknown>, message?: string) =>
  NextResponse.json({
    success: true,
    ...(message && { message }),
    ...data,  // Spread data at root level for backward compatibility
  });

/** @deprecated Use createApiErrorResponse instead */
export const errorResponse = (error: unknown, defaultMessage: string, status = 500) => {
  // Log the original error server-side; send generic message to client for 5xx
  if (error instanceof Error) {
    logger.error(`[errorResponse] ${defaultMessage}: ${error.message}`, { stack: error.stack });
  }
  const clientMessage = status >= 500 ? 'An internal error occurred' : defaultMessage;
  return createApiErrorResponse(
    status === 404 ? ApiErrorCode.RESOURCE_NOT_FOUND :
    status === 400 ? ApiErrorCode.VALIDATION_ERROR :
    ApiErrorCode.INTERNAL_ERROR,
    clientMessage,
    {
      logError: false, // Already logged above
      status,
    }
  );
};
