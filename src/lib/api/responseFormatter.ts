/**
 * Unified API response formatter.
 *
 * All API routes should use these helpers so every response follows:
 *   { success: boolean, data?: T, error?: string, timestamp: string }
 */

import { NextResponse } from 'next/server';

// ── Response shapes ──────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ── Builders ─────────────────────────────────────────────────────────

/**
 * Return a JSON success response with the standard envelope.
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

/**
 * Return a JSON error response with the standard envelope.
 */
export function errorResponse(error: string, status = 500): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}
