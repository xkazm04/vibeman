import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Validates required parameters and returns error response if missing
 */
export function validateRequired(params: Record<string, unknown>, required: string[]): NextResponse | null {
  for (const field of required) {
    if (!params[field]) {
      return NextResponse.json(
        { error: `${field} is required` },
        { status: 400 }
      );
    }
  }
  return null;
}

/**
 * Creates a success response with consistent structure
 */
export function successResponse(data: Record<string, unknown>, message?: string) {
  return NextResponse.json({
    success: true,
    ...(message && { message }),
    ...data,
  });
}

/**
 * Creates an error response with consistent structure
 */
export function errorResponse(error: unknown, defaultMessage: string, status = 500) {
  logger.error(defaultMessage, { error });
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : defaultMessage,
      details: error instanceof Error ? error.message : 'Unknown error',
    },
    { status }
  );
}

/**
 * Handles operation result and returns appropriate response
 */
export function handleOperationResult(
  result: { success: boolean; error?: string; [key: string]: unknown },
  successMessage: string,
  errorMessage: string
) {
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || errorMessage },
      { status: 500 }
    );
  }

  return successResponse(result, successMessage);
}
