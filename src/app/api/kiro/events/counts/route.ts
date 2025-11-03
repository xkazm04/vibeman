import { NextRequest, NextResponse } from 'next/server';
import { eventDb } from '@/lib/eventDatabase';

/**
 * Extract project ID from request
 */
function extractProjectId(request: NextRequest): string {
  const { searchParams } = new URL(request.url);
  return searchParams.get('projectId') || 'default';
}

/**
 * Create error response
 */
function createErrorResponse(error: unknown, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const projectId = extractProjectId(request);

    // Get event counts from SQLite database
    const counts = eventDb.getEventCountsByProject(projectId);

    return NextResponse.json({
      success: true,
      counts
    });
  } catch (error) {
    return createErrorResponse(error, 'Failed to fetch event counts');
  }
}