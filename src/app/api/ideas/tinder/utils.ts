/**
 * Shared utilities for tinder API routes
 */

import { NextResponse } from 'next/server';

/**
 * Create error response with consistent format.
 * For 5xx errors, internal details are NOT sent to the client.
 */
export function createErrorResponse(
  message: string,
  _details?: unknown,
  status = 500
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

/**
 * Create success response with consistent format
 */
export function createSuccessResponse(data: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status });
}
