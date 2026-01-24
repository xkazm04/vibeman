import { NextRequest, NextResponse } from 'next/server';
import { eventRepository } from '@/app/db/repositories/event.repository';
import { extractProjectId, createErrorResponse } from '../utils';
import { withObservability } from '@/lib/observability/middleware';

/**
 * GET /api/blueprint/events/stats
 * Fetch top event counts from the last week
 *
 * Query params:
 *   - projectId: Project ID
 *   - limit: Number of top events to return (default: 10)
 */
async function handleGet(request: NextRequest) {
  try {
    const { projectId, error } = extractProjectId(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Fetch top events from last week
    const stats = eventRepository.getTopEventCountsLastWeek(projectId!, limit);

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export const GET = withObservability(handleGet, '/api/blueprint/events/stats');







