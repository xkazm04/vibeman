import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import {
  IdeasErrorCode,
  handleIdeasApiError,
  isValidIdeaStatus,
  createIdeasErrorResponse,
} from '@/app/features/Ideas/lib/ideasHandlers';
import { withObservability } from '@/lib/observability/middleware';
import { parseProjectIds, filterByProject } from '@/lib/api-helpers/projectFilter';

/**
 * GET /api/ideas/tinder
 * Fetch ideas in batches for Tinder-style evaluation
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offsetParam = searchParams.get('offset') || '0';
    const limitParam = searchParams.get('limit') || '20';
    const status = searchParams.get('status') || 'pending';

    // Validate pagination parameters
    const offset = parseInt(offsetParam, 10);
    const limit = parseInt(limitParam, 10);
    if (isNaN(offset) || isNaN(limit) || offset < 0 || limit < 1) {
      return createIdeasErrorResponse(IdeasErrorCode.INVALID_PAGINATION, {
        details: `Invalid offset (${offsetParam}) or limit (${limitParam})`,
      });
    }

    // Validate status parameter
    if (!isValidIdeaStatus(status)) {
      return createIdeasErrorResponse(IdeasErrorCode.INVALID_STATUS, {
        field: 'status',
        details: `Invalid status value: ${status}`,
      });
    }

    // Get ideas filtered by project(s)
    const filter = parseProjectIds(searchParams);
    let allIdeas = filter.mode === 'single'
      ? ideaDb.getIdeasByProject(filter.projectId!)
      : filterByProject(ideaDb.getAllIdeas(), filter);

    // Filter by status
    const filteredIdeas = allIdeas.filter(idea => idea.status === status);

    // Sort by created_at (newest first)
    const sortedIdeas = filteredIdeas.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Paginate
    const paginatedIdeas = sortedIdeas.slice(offset, offset + limit);
    const hasMore = offset + limit < sortedIdeas.length;

    return NextResponse.json({
      ideas: paginatedIdeas,
      hasMore,
      total: sortedIdeas.length,
    });
  } catch (error) {
    return handleIdeasApiError(error, IdeasErrorCode.DATABASE_ERROR);
  }
}

export const GET = withObservability(handleGet, '/api/ideas/tinder');
