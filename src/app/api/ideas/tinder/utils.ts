/**
 * Shared utilities for tinder API routes
 */

import { NextResponse } from 'next/server';

/**
 * Create error response with consistent format
 */
export function createErrorResponse(
  message: string,
  details?: unknown,
  status = 500
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      details: details instanceof Error ? details.message : (typeof details === 'string' ? details : 'Unknown error')
    },
    { status }
  );
}

/**
 * Create success response with consistent format
 */
export function createSuccessResponse(data: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status });
}
