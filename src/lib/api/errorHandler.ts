/**
 * Standardized API error handling.
 *
 * Provides typed error classes for common HTTP failure modes and a
 * catch-all handler that maps any thrown value to the unified response
 * envelope from `responseFormatter`.
 *
 * The typed error classes (ValidationError, NotFoundError, ConflictError)
 * are convenience wrappers that integrate with the centralized error
 * system in `@/lib/api-errors`. Prefer using `handleApiError` from
 * `@/lib/api-errors` directly in new code.
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { sanitizeErrorMessage } from '@/lib/api-helpers/errorSanitizer';
import { errorResponse, type ApiErrorResponse } from './responseFormatter';

// ── Typed API errors ─────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

// ── Catch-all handler ────────────────────────────────────────────────

/**
 * Convert any thrown value into a standard error response.
 *
 * - Known ApiError instances: returns sanitized message at the specified status.
 * - 4xx errors: client sees the sanitized message (input problems are safe).
 * - 5xx errors: client sees a generic message; full details are logged server-side only.
 *
 * @param error  - The caught value (Error, ApiError, or unknown).
 * @param context - Optional label logged alongside the error for tracing.
 */
export function handleApiError(
  error: unknown,
  context?: string,
): NextResponse<ApiErrorResponse> {
  // Known API errors — safe to return with their status code
  if (error instanceof ApiError) {
    if (context) logger.error(`${context}:`, error);

    // 4xx: sanitize but keep user-facing message
    // 5xx: generic message only, never expose internals
    const clientMessage = error.statusCode >= 500
      ? 'An internal error occurred'
      : sanitizeErrorMessage(error.message);

    return errorResponse(clientMessage, error.statusCode);
  }

  // Unknown errors — always log full details server-side
  const rawMessage =
    error instanceof Error ? error.message : 'Internal server error';

  logger.error(`${context ?? 'handleApiError'}:`, {
    message: rawMessage,
    stack: error instanceof Error ? error.stack : undefined,
    error: typeof error === 'string' ? error : undefined,
  });

  // Never expose raw error messages for 500s
  return errorResponse('An internal error occurred', 500);
}
