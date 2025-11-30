import { NextRequest, NextResponse } from 'next/server';
import { ideaDb, DbIdea, DbIdeaWithColor } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  validateIdeasRequired,
  handleIdeasApiError,
  isValidIdeaStatus,
} from '@/app/features/Ideas/lib/ideasHandlers';
import { analyticsAggregationService } from '@/lib/services/analyticsAggregation';

/**
 * GET /api/ideas
 * Get all ideas or filter by query parameters
 * Query params:
 * - projectId: Filter by project
 * - goalId: Filter by goal (can be combined with projectId)
 * - status: Filter by status
 * - contextId: Filter by context
 * - limit: Limit number of results
 * - withColors: Include context colors in response (default: true for better performance)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const goalId = searchParams.get('goalId');
    const status = searchParams.get('status');
    const contextId = searchParams.get('contextId');
    const limit = searchParams.get('limit');
    const withColors = searchParams.get('withColors') !== 'false'; // Default to true

    let ideas: DbIdea[] | DbIdeaWithColor[];

    // Use optimized JOIN queries when possible
    if (withColors) {
      // Priority order: goalId > contextId > projectId > status > limit > all
      if (goalId) {
        // For goalId, we still need to use the regular method and filter
        ideas = ideaDb.getIdeasByGoal(goalId);
        // If projectId is also specified, filter the results
        if (projectId) {
          ideas = ideas.filter(idea => idea.project_id === projectId);
        }
      } else if (contextId) {
        // For contextId, use regular method (no color needed when filtering by context)
        ideas = ideaDb.getIdeasByContext(contextId);
      } else if (projectId) {
        // Optimized: Get ideas by project with colors in one query
        ideas = ideaDb.getIdeasByProjectWithColors(projectId);
      } else if (status) {
        // Optimized: Get ideas by status with colors in one query
        ideas = ideaDb.getIdeasByStatusWithColors(status as any);
      } else if (limit) {
        // For limit, use regular method
        ideas = ideaDb.getRecentIdeas(parseInt(limit, 10));
      } else {
        // Optimized: Get all ideas with colors in one query
        ideas = ideaDb.getAllIdeasWithColors();
      }
    } else {
      // Legacy mode: without colors (if needed)
      if (goalId) {
        ideas = ideaDb.getIdeasByGoal(goalId);
        if (projectId) {
          ideas = ideas.filter(idea => idea.project_id === projectId);
        }
      } else if (contextId) {
        ideas = ideaDb.getIdeasByContext(contextId);
      } else if (projectId) {
        ideas = ideaDb.getIdeasByProject(projectId);
      } else if (status) {
        ideas = ideaDb.getIdeasByStatus(status as any);
      } else if (limit) {
        ideas = ideaDb.getRecentIdeas(parseInt(limit, 10));
      } else {
        ideas = ideaDb.getAllIdeas();
      }
    }

    return NextResponse.json({ ideas });
  } catch (error) {
    return handleIdeasApiError(error, IdeasErrorCode.DATABASE_ERROR);
  }
}

/**
 * POST /api/ideas
 * Create a new idea
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      scan_id,
      project_id,
      context_id,
      scan_type,
      category,
      title,
      description,
      reasoning,
      status,
      user_feedback,
      user_pattern
    } = body;

    const validationError = validateIdeasRequired(
      { scan_id, project_id, category, title },
      ['scan_id', 'project_id', 'category', 'title']
    );
    if (validationError) return validationError;

    const idea = ideaDb.createIdea({
      id: uuidv4(),
      scan_id,
      project_id,
      context_id: context_id || null,
      scan_type: scan_type || 'manual',
      category,
      title,
      description,
      reasoning,
      status,
      user_feedback,
      user_pattern
    });

    // Invalidate analytics cache for this project
    analyticsAggregationService.invalidateCacheForProject(project_id);

    return NextResponse.json({ idea }, { status: 201 });
  } catch (error) {
    return handleIdeasApiError(error, IdeasErrorCode.CREATE_FAILED);
  }
}

/**
 * PATCH /api/ideas
 * Update an existing idea
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      user_feedback,
      user_pattern,
      title,
      description,
      reasoning
    } = body;

    const validationError = validateIdeasRequired({ id }, ['id']);
    if (validationError) return validationError;

    // Validate status if provided
    if (status && !isValidIdeaStatus(status)) {
      return createIdeasErrorResponse(IdeasErrorCode.INVALID_STATUS, {
        field: 'status',
        details: `Invalid status value: ${status}`,
      });
    }

    const idea = ideaDb.updateIdea(id, {
      status,
      user_feedback,
      user_pattern,
      title,
      description,
      reasoning
    });

    if (!idea) {
      return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND, {
        details: `No idea found with id: ${id}`,
      });
    }

    // Invalidate analytics cache for this project
    analyticsAggregationService.invalidateCacheForProject(idea.project_id);

    return NextResponse.json({ idea });
  } catch (error) {
    return handleIdeasApiError(error, IdeasErrorCode.UPDATE_FAILED);
  }
}

/**
 * DELETE /api/ideas
 * Delete an idea or all ideas
 * Query params:
 * - id: Delete a single idea by ID
 * - all=true: Delete all ideas (WARNING: destructive)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';

    // Delete all ideas (for testing purposes)
    if (deleteAll) {
      const deletedCount = ideaDb.deleteAllIdeas();
      logger.info(`[DELETE ALL IDEAS] Deleted ${deletedCount} ideas from database`);

      // Invalidate all analytics cache
      analyticsAggregationService.invalidateCache();

      return NextResponse.json({
        success: true,
        deletedCount,
        message: `Successfully deleted ${deletedCount} ideas`
      });
    }

    // Delete single idea
    if (!id) {
      return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
        field: 'id',
        message: 'id parameter is required (or use all=true to delete all)',
      });
    }

    // Get idea before deletion to access project_id
    const ideaToDelete = ideaDb.getIdeaById(id);
    const success = ideaDb.deleteIdea(id);

    if (!success) {
      return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND, {
        details: `No idea found with id: ${id}`,
      });
    }

    // Invalidate analytics cache for this project
    if (ideaToDelete) {
      analyticsAggregationService.invalidateCacheForProject(ideaToDelete.project_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleIdeasApiError(error, IdeasErrorCode.DELETE_FAILED);
  }
}
