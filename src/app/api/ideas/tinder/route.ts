import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import type { DbIdea } from '@/app/db/models/types';
import {
  IdeasErrorCode,
  handleIdeasApiError,
  isValidIdeaStatus,
  createIdeasErrorResponse,
} from '@/app/features/Ideas/lib/ideasHandlers';
import { withObservability } from '@/lib/observability/middleware';
import { parseProjectIds } from '@/lib/api-helpers/projectFilter';

/**
 * GET /api/ideas/tinder
 * Fetch ideas in batches for Tinder-style evaluation
 * Uses SQL-level filtering, sorting, and pagination for O(1) memory usage.
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

    // Use SQL-level filtering and pagination to avoid loading all ideas into memory
    const filter = parseProjectIds(searchParams);

    let ideas: DbIdea[];
    let total: number;

    if (filter.mode === 'single') {
      const result = ideaDb.getIdeasByProjectAndStatus(filter.projectId!, status, limit, offset);
      ideas = result.ideas;
      total = result.total;
    } else if (filter.mode === 'multi') {
      const result = ideaDb.getIdeasByProjectsAndStatus(filter.projectIds!, status, limit, offset);
      ideas = result.ideas;
      total = result.total;
    } else {
      const result = ideaDb.getAllIdeasByStatusPaginated(status, limit, offset);
      ideas = result.ideas;
      total = result.total;
    }

    const hasMore = offset + limit < total;

    return NextResponse.json({
      ideas,
      hasMore,
      total,
    });
  } catch (error) {
    return handleIdeasApiError(error, IdeasErrorCode.DATABASE_ERROR);
  }
}

export const GET = withObservability(handleGet, '/api/ideas/tinder');
