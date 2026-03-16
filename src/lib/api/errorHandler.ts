/**
 * Standardized API error handling.
 *
 * Provides typed error classes for common HTTP failure modes and a
 * catch-all handler that maps any thrown value to the unified response
 * envelope from `responseFormatter`.
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
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
 * @param error  - The caught value (Error, ApiError, or unknown).
 * @param context - Optional label logged alongside the error for tracing.
 */
export function handleApiError(
  error: unknown,
  context?: string,
): NextResponse<ApiErrorResponse> {
  if (error instanceof ApiError) {
    if (context) logger.error(`${context}:`, error);
    return errorResponse(error.message, error.statusCode);
  }

  const message =
    error instanceof Error ? error.message : 'Internal server error';

  if (context) {
    logger.error(`${context}:`, error);
  }

  return errorResponse(message, 500);
}
