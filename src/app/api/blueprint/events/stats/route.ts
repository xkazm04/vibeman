import { NextRequest, NextResponse } from 'next/server';
import { eventRepository } from '@/app/db/repositories/event.repository';

/**
 * GET /api/blueprint/events/stats
 * Fetch top event counts from the last week
 *
 * Query params:
 *   - projectId: Project ID
 *   - limit: Number of top events to return (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing projectId parameter'
        },
        { status: 400 }
      );
    }

    // Fetch top events from last week
    const stats = eventRepository.getTopEventCountsLastWeek(projectId, limit);

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[Blueprint Events Stats API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}








