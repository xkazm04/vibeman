import { NextRequest, NextResponse } from 'next/server';
import { ideaDb, contextDb, scanDb, DbIdea, DbIdeaWithColor } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  handleIdeasApiError,
  isValidIdeaStatus,
} from '@/app/features/Ideas/lib/ideasHandlers';
import { analyticsAggregationService } from '@/lib/services/analyticsAggregation';
import { withObservability } from '@/lib/observability/middleware';
import { parseProjectIds, filterByProject } from '@/lib/api-helpers/projectFilter';
import { validateRequestBody } from '@/lib/validation/apiValidator';
import {
  validateUUID,
  validateEntityId,
  validateIdeaTitle,
  validateIdeaDescription,
  validateIdeaReasoning,
  validateIdeaFeedback,
  validateIdeaStatus,
  validateScore,
  validateScanType,
  validateCategory,
  validateBooleanFlag,
} from '@/lib/validation/inputValidator';
import { sanitizeString, sanitizeId } from '@/lib/validation/sanitizers';

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
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectFilter = parseProjectIds(searchParams);
    const goalId = searchParams.get('goalId');
    const status = searchParams.get('status');
    const contextId = searchParams.get('contextId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 100) : null;
    const withColors = searchParams.get('withColors') !== 'false'; // Default to true

    // Validate query params when provided
    if (status && !isValidIdeaStatus(status)) {
      return createIdeasErrorResponse(IdeasErrorCode.INVALID_STATUS, {
        field: 'status',
        details: `Invalid status value: ${status}`,
      });
    }

    let ideas: DbIdea[] | DbIdeaWithColor[];

    // Use optimized JOIN queries when possible
    if (withColors) {
      // Priority order: goalId > contextId > projectId > status > limit > all
      if (goalId) {
        ideas = ideaDb.getIdeasByGoal(goalId);
        if (projectFilter.mode !== 'all') {
          ideas = filterByProject(ideas, projectFilter);
        }
      } else if (contextId) {
        ideas = ideaDb.getIdeasByContext(contextId);
      } else if (projectFilter.mode === 'single') {
        ideas = ideaDb.getIdeasByProjectWithColors(projectFilter.projectId!);
      } else if (projectFilter.mode === 'multi') {
        ideas = ideaDb.getIdeasByProjectIdsWithColors(projectFilter.projectIds!);
      } else if (status) {
        ideas = ideaDb.getIdeasByStatusWithColors(status as any);
      } else if (limit) {
        ideas = ideaDb.getRecentIdeas(limit!);
      } else {
        ideas = ideaDb.getAllIdeasWithColors();
      }
    } else {
      // Legacy mode: without colors
      if (goalId) {
        ideas = ideaDb.getIdeasByGoal(goalId);
        if (projectFilter.mode !== 'all') {
          ideas = filterByProject(ideas, projectFilter);
        }
      } else if (contextId) {
        ideas = ideaDb.getIdeasByContext(contextId);
      } else if (projectFilter.mode === 'single') {
        ideas = ideaDb.getIdeasByProject(projectFilter.projectId!);
      } else if (projectFilter.mode === 'multi') {
        ideas = ideaDb.getIdeasByProjectIds(projectFilter.projectIds!);
      } else if (status) {
        ideas = ideaDb.getIdeasByStatus(status as any);
      } else if (limit) {
        ideas = ideaDb.getRecentIdeas(limit!);
      } else {
        ideas = ideaDb.getAllIdeas();
      }
    }

    return NextResponse.json({
      ideas,
      ...(limit !== null && { pagination: { appliedLimit: limit } }),
    });
  } catch (error) {
    return handleIdeasApiError(error, IdeasErrorCode.DATABASE_ERROR);
  }
}

/**
 * POST /api/ideas
 * Create a new idea
 *
 * @example Valid request body:
 * ```json
 * {
 *   "scan_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 *   "project_id": "f1e2d3c4-b5a6-7890-fedc-ba0987654321",
 *   "category": "functionality",
 *   "title": "Add user authentication flow",
 *   "description": "Implement OAuth2 login with Google provider",
 *   "scan_type": "manual",
 *   "effort": 5,
 *   "impact": 8,
 *   "risk": 3
 * }
 * ```
 */
async function handlePost(request: NextRequest) {
  try {
    const result = await validateRequestBody(request, {
      required: [
        { field: 'scan_id', validator: validateUUID },
        { field: 'project_id', validator: validateUUID },
        { field: 'category', validator: validateCategory },
        { field: 'title', validator: validateIdeaTitle },
      ],
      optional: [
        { field: 'context_id', validator: validateEntityId },
        { field: 'scan_type', validator: validateScanType },
        { field: 'description', validator: validateIdeaDescription },
        { field: 'reasoning', validator: validateIdeaReasoning },
        { field: 'status', validator: validateIdeaStatus },
        { field: 'user_feedback', validator: validateIdeaFeedback },
        { field: 'user_pattern', validator: validateBooleanFlag },
        { field: 'effort', validator: validateScore },
        { field: 'impact', validator: validateScore },
        { field: 'risk', validator: validateScore },
      ],
    });

    if (!result.success) return result.error;

    const body = result.data;

    // Sanitize string fields before passing to database
    const sanitizedTitle = sanitizeString(body.title as string, 500);
    const sanitizedDescription = body.description ? sanitizeString(body.description as string, 5000) : null;
    const sanitizedReasoning = body.reasoning ? sanitizeString(body.reasoning as string, 5000) : null;
    const sanitizedFeedback = body.user_feedback ? sanitizeString(body.user_feedback as string, 2000) : null;
    const sanitizedCategory = sanitizeString(body.category as string, 100);
    const sanitizedScanType = body.scan_type ? sanitizeString(body.scan_type as string, 100) : 'manual';

    // Validate FK references exist before inserting to prevent opaque FK constraint errors
    const sanitizedScanId = sanitizeId(body.scan_id as string);
    if (!scanDb.getScanById(sanitizedScanId)) {
      return createIdeasErrorResponse(IdeasErrorCode.CREATE_FAILED, {
        message: `scan_id "${sanitizedScanId}" does not exist in scans table`,
        field: 'scan_id',
        status: 400,
      });
    }

    let resolvedContextId: string | null = null;
    if (body.context_id) {
      const sanitizedCtxId = sanitizeId(body.context_id as string);
      if (contextDb.getContextById(sanitizedCtxId)) {
        resolvedContextId = sanitizedCtxId;
      } else {
        logger.warn('[Ideas API] context_id not found in contexts table, setting to null', {
          context_id: sanitizedCtxId,
        });
      }
    }

    const idea = ideaDb.createIdea({
      id: uuidv4(),
      scan_id: sanitizedScanId,
      project_id: sanitizeId(body.project_id as string),
      context_id: resolvedContextId,
      scan_type: sanitizedScanType,
      category: sanitizedCategory,
      title: sanitizedTitle,
      description: sanitizedDescription ?? undefined,
      reasoning: sanitizedReasoning ?? undefined,
      status: body.status as 'pending' | 'accepted' | 'rejected' | 'implemented' | undefined,
      user_feedback: sanitizedFeedback ?? undefined,
      user_pattern: body.user_pattern != null ? Boolean(body.user_pattern) : undefined,
      effort: body.effort as number | undefined,
      impact: body.impact as number | undefined,
      risk: body.risk as number | undefined,
    });

    // Invalidate analytics cache for this project
    analyticsAggregationService.invalidateCacheForProject(body.project_id as string);

    return NextResponse.json({ idea }, { status: 201 });
  } catch (error) {
    return handleIdeasApiError(error, IdeasErrorCode.CREATE_FAILED);
  }
}

/**
 * PATCH /api/ideas
 * Update an existing idea
 *
 * @example Valid request body:
 * ```json
 * {
 *   "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 *   "status": "accepted",
 *   "user_feedback": "Good suggestion, will implement next sprint",
 *   "effort": 3,
 *   "impact": 7
 * }
 * ```
 */
async function handlePatch(request: NextRequest) {
  try {
    const result = await validateRequestBody(request, {
      required: [
        { field: 'id', validator: validateUUID },
      ],
      optional: [
        { field: 'status', validator: validateIdeaStatus },
        { field: 'user_feedback', validator: validateIdeaFeedback },
        { field: 'user_pattern', validator: validateBooleanFlag },
        { field: 'title', validator: validateIdeaTitle },
        { field: 'description', validator: validateIdeaDescription },
        { field: 'reasoning', validator: validateIdeaReasoning },
        { field: 'effort', validator: validateScore },
        { field: 'impact', validator: validateScore },
        { field: 'risk', validator: validateScore },
      ],
    });

    if (!result.success) return result.error;

    const body = result.data;

    // Sanitize string fields before passing to database
    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.user_feedback !== undefined) updates.user_feedback = sanitizeString(body.user_feedback as string, 2000);
    if (body.user_pattern !== undefined) updates.user_pattern = body.user_pattern;
    if (body.title !== undefined) updates.title = sanitizeString(body.title as string, 500);
    if (body.description !== undefined) updates.description = sanitizeString(body.description as string, 5000);
    if (body.reasoning !== undefined) updates.reasoning = sanitizeString(body.reasoning as string, 5000);
    if (body.effort !== undefined) updates.effort = body.effort;
    if (body.impact !== undefined) updates.impact = body.impact;
    if (body.risk !== undefined) updates.risk = body.risk;

    const idea = ideaDb.updateIdea(sanitizeId(body.id as string), updates);

    if (!idea) {
      return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND, {
        details: `No idea found with id: ${sanitizeId(body.id as string)}`,
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
async function handleDelete(request: NextRequest) {
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

    // Validate ID format
    const idError = validateUUID(id);
    if (idError) {
      return createIdeasErrorResponse(IdeasErrorCode.INVALID_ID_FORMAT, {
        field: 'id',
        details: `id ${idError}`,
      });
    }

    const sanitizedId = sanitizeId(id);

    // Get idea before deletion to access project_id
    const ideaToDelete = ideaDb.getIdeaById(sanitizedId);
    const success = ideaDb.deleteIdea(sanitizedId);

    if (!success) {
      return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND, {
        details: `No idea found with id: ${sanitizedId}`,
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

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/ideas');
export const POST = withObservability(handlePost, '/api/ideas');
export const PATCH = withObservability(handlePatch, '/api/ideas');
export const DELETE = withObservability(handleDelete, '/api/ideas');
