/**
 * Shared utilities for events API routes
 */

import { NextResponse } from 'next/server';

/**
 * Create error response with consistent format
 */
export function createErrorResponse(
  error: unknown,
  message: string,
  status = 500
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Unknown error')
    },
    { status }
  );
}
