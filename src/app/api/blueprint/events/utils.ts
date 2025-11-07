/**
 * Shared utilities for blueprint events API routes
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract and validate projectId from query params
 */
export function extractProjectId(request: NextRequest): { projectId: string | null; error?: NextResponse } {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return {
      projectId: null,
      error: NextResponse.json(
        {
          success: false,
          error: 'Missing projectId parameter'
        },
        { status: 400 }
      )
    };
  }

  return { projectId };
}

/**
 * Create error response with consistent format
 */
export function createErrorResponse(error: unknown, message?: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    },
    { status: 500 }
  );
}
