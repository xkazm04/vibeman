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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // 'pending', 'accepted', 'rejected', or null for all
    const contextMapId = searchParams.get('contextMapId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    let directions;

    if (contextMapId) {
      directions = directionDb.getDirectionsByContextMapId(projectId, contextMapId);
    } else if (status === 'pending') {
      directions = directionDb.getPendingDirections(projectId);
    } else if (status === 'accepted') {
      directions = directionDb.getAcceptedDirections(projectId);
    } else if (status === 'rejected') {
      directions = directionDb.getRejectedDirections(projectId);
    } else {
      directions = directionDb.getDirectionsByProject(projectId);
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

    const counts = directionDb.getDirectionCounts(projectId);

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      project_id,
      context_map_id,
      context_map_title,
      direction,
      summary
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
      requirement_path: body.requirement_path || null
    });

    logger.info('[API] Direction created:', { id: createdDirection.id, context_map_id });

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
