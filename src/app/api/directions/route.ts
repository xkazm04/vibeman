/**
 * API Route: Directions
 *
 * GET /api/directions?projectId=xxx
 * POST /api/directions (create direction - called by Claude Code)
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { withObservability } from '@/lib/observability/middleware';
import { parseProjectIds } from '@/lib/api-helpers/projectFilter';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectFilter = parseProjectIds(searchParams);
    const status = searchParams.get('status'); // 'pending', 'accepted', 'rejected', or null for all
    const contextMapId = searchParams.get('contextMapId');
    // Support SQLite context filtering
    const contextId = searchParams.get('contextId');
    const contextGroupId = searchParams.get('contextGroupId');

    if (projectFilter.mode === 'all') {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    // For multi-project: query each and merge
    const projectIds = projectFilter.mode === 'single'
      ? [projectFilter.projectId!]
      : projectFilter.projectIds!;

    let directions: any[] = [];

    for (const projectId of projectIds) {
      let projectDirections;
      if (contextId) {
        projectDirections = directionDb.getDirectionsByContextId(projectId, contextId);
      } else if (contextGroupId) {
        projectDirections = directionDb.getDirectionsByContextGroupId(projectId, contextGroupId);
      } else if (contextMapId) {
        projectDirections = directionDb.getDirectionsByContextMapId(projectId, contextMapId);
      } else if (status === 'pending') {
        projectDirections = directionDb.getPendingDirections(projectId);
      } else if (status === 'accepted') {
        projectDirections = directionDb.getAcceptedDirections(projectId);
      } else if (status === 'rejected') {
        projectDirections = directionDb.getRejectedDirections(projectId);
      } else {
        projectDirections = directionDb.getDirectionsByProject(projectId);
      }
      directions.push(...projectDirections);
    }

    // Group directions by context_map_id for UI display
    const grouped: Record<string, {
      contextMapId: string;
      contextMapTitle: string;
      directions: typeof directions;
    }> = {};

    for (const d of directions) {
      if (!grouped[d.context_map_id]) {
        grouped[d.context_map_id] = {
          contextMapId: d.context_map_id,
          contextMapTitle: d.context_map_title,
          directions: []
        };
      }
      grouped[d.context_map_id].directions.push(d);
    }

    const counts = directionDb.getDirectionCounts(projectIds[0]);

    return NextResponse.json({
      success: true,
      directions,
      grouped: Object.values(grouped),
      counts
    });

  } catch (error) {
    logger.error('[API] Directions GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      project_id,
      context_map_id,
      context_map_title,
      direction,
      summary,
      // NEW: SQLite context fields
      context_id,
      context_name,
      context_group_id
    } = body;

    // Validate required fields
    if (!project_id || !context_map_id || !context_map_title || !direction || !summary) {
      return NextResponse.json(
        { error: 'project_id, context_map_id, context_map_title, direction, and summary are required' },
        { status: 400 }
      );
    }

    // Create the direction
    const id = body.id || `direction_${uuidv4()}`;

    const createdDirection = directionDb.createDirection({
      id,
      project_id,
      context_map_id,
      context_map_title,
      direction,
      summary,
      status: body.status || 'pending',
      requirement_id: body.requirement_id || null,
      requirement_path: body.requirement_path || null,
      // NEW: SQLite context fields for unified context management
      context_id: context_id || null,
      context_name: context_name || null,
      context_group_id: context_group_id || null
    });

    logger.info('[API] Direction created:', {
      id: createdDirection.id,
      context_map_id,
      context_id: context_id || 'none',
      context_group_id: context_group_id || 'none'
    });

    return NextResponse.json({
      success: true,
      direction: createdDirection
    });

  } catch (error) {
    logger.error('[API] Directions POST error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/directions');
export const POST = withObservability(handlePost, '/api/directions');
