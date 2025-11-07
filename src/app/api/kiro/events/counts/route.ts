import { NextRequest, NextResponse } from 'next/server';
import { eventDb } from '@/lib/eventDatabase';
import { createErrorResponse } from '../utils';

/**
 * Extract project ID from request
 */
function extractProjectId(request: NextRequest): string {
  const { searchParams } = new URL(request.url);
  return searchParams.get('projectId') || 'default';
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