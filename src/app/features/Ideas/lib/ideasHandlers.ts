/**
 * Handler functions for ideas page operations
 */

import { DbIdea } from '@/app/db';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// =============================================================================
// IDEAS API ERROR CODES
// =============================================================================

/**
 * Typed error codes for Ideas API endpoints
 * These codes can be handled programmatically by frontend components
 */
export const IdeasErrorCode = {
  // Validation errors (400)
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FILTER: 'INVALID_FILTER',
  INVALID_STATUS: 'INVALID_STATUS',
  INVALID_ACTION: 'INVALID_ACTION',
  INVALID_ID_FORMAT: 'INVALID_ID_FORMAT',
  INVALID_PAGINATION: 'INVALID_PAGINATION',

  // Not found errors (404)
  IDEA_NOT_FOUND: 'IDEA_NOT_FOUND',
  CONTEXT_NOT_FOUND: 'CONTEXT_NOT_FOUND',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  REQUIREMENT_NOT_FOUND: 'REQUIREMENT_NOT_FOUND',

  // Conflict errors (409)
  IDEA_ALREADY_EXISTS: 'IDEA_ALREADY_EXISTS',
  DUPLICATE_REQUIREMENT: 'DUPLICATE_REQUIREMENT',

  // Server errors (500)
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  FILE_OPERATION_FAILED: 'FILE_OPERATION_FAILED',
  UPDATE_FAILED: 'UPDATE_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  CREATE_FAILED: 'CREATE_FAILED',
} as const;

export type IdeasErrorCodeType = typeof IdeasErrorCode[keyof typeof IdeasErrorCode];

/**
 * Standard error response structure for Ideas API
 */
export interface IdeasApiError {
  /** Programmatic error code for frontend handling */
  code: IdeasErrorCodeType;
  /** Developer-friendly error message */
  message: string;
  /** Additional context or details about the error */
  details?: string;
  /** Field that caused the error (for validation errors) */
  field?: string;
  /** Original error message if available */
  originalError?: string;
}

/**
 * Maps error codes to their default HTTP status codes
 */
const ERROR_CODE_TO_STATUS: Record<IdeasErrorCodeType, number> = {
  // 400 Bad Request
  [IdeasErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [IdeasErrorCode.INVALID_FILTER]: 400,
  [IdeasErrorCode.INVALID_STATUS]: 400,
  [IdeasErrorCode.INVALID_ACTION]: 400,
  [IdeasErrorCode.INVALID_ID_FORMAT]: 400,
  [IdeasErrorCode.INVALID_PAGINATION]: 400,

  // 404 Not Found
  [IdeasErrorCode.IDEA_NOT_FOUND]: 404,
  [IdeasErrorCode.CONTEXT_NOT_FOUND]: 404,
  [IdeasErrorCode.PROJECT_NOT_FOUND]: 404,
  [IdeasErrorCode.REQUIREMENT_NOT_FOUND]: 404,

  // 409 Conflict
  [IdeasErrorCode.IDEA_ALREADY_EXISTS]: 409,
  [IdeasErrorCode.DUPLICATE_REQUIREMENT]: 409,

  // 500 Internal Server Error
  [IdeasErrorCode.DATABASE_ERROR]: 500,
  [IdeasErrorCode.INTERNAL_ERROR]: 500,
  [IdeasErrorCode.FILE_OPERATION_FAILED]: 500,
  [IdeasErrorCode.UPDATE_FAILED]: 500,
  [IdeasErrorCode.DELETE_FAILED]: 500,
  [IdeasErrorCode.CREATE_FAILED]: 500,
};

/**
 * Default developer-friendly messages for each error code
 */
const DEFAULT_ERROR_MESSAGES: Record<IdeasErrorCodeType, string> = {
  [IdeasErrorCode.MISSING_REQUIRED_FIELD]: 'A required field is missing from the request',
  [IdeasErrorCode.INVALID_FILTER]: 'The provided filter parameter is invalid',
  [IdeasErrorCode.INVALID_STATUS]: 'The provided status value is not valid',
  [IdeasErrorCode.INVALID_ACTION]: 'The action parameter is not recognized',
  [IdeasErrorCode.INVALID_ID_FORMAT]: 'The provided ID format is invalid',
  [IdeasErrorCode.INVALID_PAGINATION]: 'Invalid pagination parameters provided',

  [IdeasErrorCode.IDEA_NOT_FOUND]: 'The requested idea could not be found',
  [IdeasErrorCode.CONTEXT_NOT_FOUND]: 'The specified context does not exist',
  [IdeasErrorCode.PROJECT_NOT_FOUND]: 'The specified project does not exist',
  [IdeasErrorCode.REQUIREMENT_NOT_FOUND]: 'No idea found with the specified requirement ID',

  [IdeasErrorCode.IDEA_ALREADY_EXISTS]: 'An idea with this identifier already exists',
  [IdeasErrorCode.DUPLICATE_REQUIREMENT]: 'A requirement with this name already exists',

  [IdeasErrorCode.DATABASE_ERROR]: 'A database error occurred while processing the request',
  [IdeasErrorCode.INTERNAL_ERROR]: 'An unexpected internal error occurred',
  [IdeasErrorCode.FILE_OPERATION_FAILED]: 'Failed to perform file system operation',
  [IdeasErrorCode.UPDATE_FAILED]: 'Failed to update the resource',
  [IdeasErrorCode.DELETE_FAILED]: 'Failed to delete the resource',
  [IdeasErrorCode.CREATE_FAILED]: 'Failed to create the resource',
};

// =============================================================================
// ERROR RESPONSE UTILITIES
// =============================================================================

export interface CreateErrorResponseOptions {
  /** Override the default HTTP status code */
  status?: number;
  /** Additional details about the error */
  details?: string;
  /** The field that caused the error (for validation) */
  field?: string;
  /** The original error object for logging */
  originalError?: unknown;
  /** Custom message to override the default */
  message?: string;
  /** Whether to log the error (default: true for 5xx errors) */
  shouldLog?: boolean;
}

/**
 * Creates a standardized error response for Ideas API endpoints
 *
 * @param code - The typed error code
 * @param options - Optional configuration for the error response
 * @returns NextResponse with consistent error structure
 *
 * @example
 * // Simple usage
 * return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND);
 *
 * @example
 * // With custom message and field
 * return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
 *   field: 'contextId',
 *   message: 'contextId is required for this operation'
 * });
 *
 * @example
 * // With original error for logging
 * return createIdeasErrorResponse(IdeasErrorCode.DATABASE_ERROR, {
 *   originalError: error,
 *   details: 'Failed to fetch ideas from database'
 * });
 */
export function createIdeasErrorResponse(
  code: IdeasErrorCodeType,
  options: CreateErrorResponseOptions = {}
): NextResponse<{ error: IdeasApiError }> {
  const {
    status = ERROR_CODE_TO_STATUS[code],
    details,
    field,
    originalError,
    message = DEFAULT_ERROR_MESSAGES[code],
    shouldLog = status >= 500,
  } = options;

  const errorBody: IdeasApiError = {
    code,
    message,
    ...(details && { details }),
    ...(field && { field }),
    ...(originalError instanceof Error && { originalError: originalError.message }),
  };

  // Log server errors by default
  if (shouldLog) {
    logger.error(`[Ideas API Error] ${code}: ${message}`, {
      code,
      status,
      details,
      field,
      error: originalError,
    });
  }

  return NextResponse.json({ error: errorBody }, { status });
}

/**
 * Creates a validation error response for missing required fields
 */
export function createMissingFieldError(fieldName: string): NextResponse<{ error: IdeasApiError }> {
  return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
    field: fieldName,
    message: `${fieldName} is required`,
  });
}

/**
 * Validates required parameters and returns error response if missing
 *
 * @param params - Object containing request parameters
 * @param required - Array of required field names
 * @returns Error response if validation fails, null otherwise
 */
export function validateIdeasRequired(
  params: Record<string, unknown>,
  required: string[]
): NextResponse<{ error: IdeasApiError }> | null {
  for (const field of required) {
    if (params[field] === undefined || params[field] === null || params[field] === '') {
      return createMissingFieldError(field);
    }
  }
  return null;
}

/**
 * Creates a success response with consistent structure
 */
export function createIdeasSuccessResponse<T extends Record<string, unknown>>(
  data: T,
  message?: string
): NextResponse<T & { success: true; message?: string }> {
  return NextResponse.json({
    success: true as const,
    ...(message && { message }),
    ...data,
  });
}

/**
 * Helper to handle caught exceptions and return appropriate error response
 */
export function handleIdeasApiError(
  error: unknown,
  defaultCode: IdeasErrorCodeType = IdeasErrorCode.INTERNAL_ERROR
): NextResponse<{ error: IdeasApiError }> {
  return createIdeasErrorResponse(defaultCode, {
    originalError: error,
    details: error instanceof Error ? error.message : 'Unknown error occurred',
  });
}

// =============================================================================
// TYPE GUARDS AND UTILITIES
// =============================================================================

/**
 * Type guard to check if an error response is an Ideas API error
 */
export function isIdeasApiError(error: unknown): error is IdeasApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as IdeasApiError).code === 'string' &&
    Object.values(IdeasErrorCode).includes((error as IdeasApiError).code as IdeasErrorCodeType)
  );
}

/**
 * Valid idea statuses for validation
 */
export const VALID_IDEA_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'implemented',
  'in_progress',
  'archived',
] as const;

export type IdeaStatus = typeof VALID_IDEA_STATUSES[number];

/**
 * Validates if a status string is a valid idea status
 */
export function isValidIdeaStatus(status: string): status is IdeaStatus {
  return VALID_IDEA_STATUSES.includes(status as IdeaStatus);
}

/**
 * Fetch all ideas from the API
 */
export async function fetchIdeas(): Promise<DbIdea[]> {
  try {
    const response = await fetch('/api/ideas');
    if (response.ok) {
      const data = await response.json();
      return data.ideas || [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Update an idea's properties
 */
export async function updateIdea(ideaId: string, updates: Partial<DbIdea>): Promise<DbIdea | null> {
  try {
    const response = await fetch('/api/ideas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ideaId,
        ...updates
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.idea;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Delete a specific idea
 */
export async function deleteIdea(ideaId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/ideas?id=${encodeURIComponent(ideaId)}`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Delete all ideas
 */
export async function deleteAllIdeas(): Promise<{ success: boolean; deletedCount: number }> {
  try {
    const response = await fetch('/api/ideas?all=true', {
      method: 'DELETE',
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, deletedCount: data.deletedCount };
    }
    return { success: false, deletedCount: 0 };
  } catch {
    return { success: false, deletedCount: 0 };
  }
}
