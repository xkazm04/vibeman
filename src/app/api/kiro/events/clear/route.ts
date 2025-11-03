import { NextRequest, NextResponse } from 'next/server';
import { eventDb } from '@/lib/eventDatabase';

/**
 * Validate request body contains project ID
 */
function validateProjectId(body: unknown): body is { projectId: string } {
  const req = body as { projectId?: string };
  return typeof req.projectId === 'string' && req.projectId.length > 0;
}

/**
 * Create error response
 */
function createErrorResponse(error: unknown, message: string, status = 500) {
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Unknown error')
    },
    { status }
  );
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!validateProjectId(body)) {
      return createErrorResponse('Project ID is required', 'Invalid request', 400);
    }

    const { projectId } = body;

    // Delete events from SQLite database
    const deletedCount = eventDb.deleteEventsByProject(projectId);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} events for project ${projectId}`
    });
  } catch (error) {
    return createErrorResponse(error, 'Failed to clear events');
  }
}