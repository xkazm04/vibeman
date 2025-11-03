/**
 * Common API route helpers to reduce code duplication
 */
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Create a standardized error response
 */
export function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Handle errors consistently across API routes
 */
export function handleError(error: unknown, operation: string) {
  logger.error(`Error in ${operation}:`, { error });
  return createErrorResponse('Internal server error', 500);
}

/**
 * Validate required parameters and return error response if missing
 */
export function validateRequired(params: Record<string, unknown>, required: string[]) {
  const missing = required.filter(key => !params[key]);
  if (missing.length > 0) {
    return createErrorResponse(`Missing required fields: ${missing.join(', ')}`, 400);
  }
  return null;
}

/**
 * Handle not found errors consistently
 */
export function notFoundResponse(resource: string) {
  return createErrorResponse(`${resource} not found`, 404);
}
