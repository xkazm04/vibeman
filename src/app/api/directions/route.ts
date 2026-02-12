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
import { signalCollector } from '@/lib/brain/signalCollector';

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

    // For multi-project: use batch queries with IN clauses for efficiency
    const projectIds = projectFilter.mode === 'single'
      ? [projectFilter.projectId!]
      : projectFilter.projectIds!;

    let directions: any[];

    // Use batch query methods to reduce database round-trips
    if (contextId) {
      directions = directionDb.getDirectionsByContextIdMultiple(projectIds, contextId);
    } else if (contextGroupId) {
      directions = directionDb.getDirectionsByContextGroupIdMultiple(projectIds, contextGroupId);
    } else if (contextMapId) {
      directions = directionDb.getDirectionsByContextMapIdMultiple(projectIds, contextMapId);
    } else if (status === 'pending') {
      directions = directionDb.getPendingDirectionsMultiple(projectIds);
    } else if (status === 'accepted') {
      directions = directionDb.getAcceptedDirectionsMultiple(projectIds);
    } else if (status === 'rejected') {
      directions = directionDb.getRejectedDirectionsMultiple(projectIds);
    } else {
      directions = directionDb.getDirectionsByProjects(projectIds);
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

    const counts = directionDb.getDirectionCountsMultiple(projectIds);

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
      context_group_id,
      // NEW: Paired directions support
      pair_id,
      pair_label,
      problem_statement
    } = body;

    // Validate required fields
    if (!project_id || !context_map_id || !context_map_title || !direction || !summary) {
      return NextResponse.json(
        { error: 'project_id, context_map_id, context_map_title, direction, and summary are required' },
        { status: 400 }
      );
    }

    // Validate pair_label if provided
    if (pair_label && !['A', 'B'].includes(pair_label)) {
      return NextResponse.json(
        { error: 'pair_label must be "A" or "B"' },
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
      context_group_id: context_group_id || null,
      // NEW: Paired directions support
      pair_id: pair_id || null,
      pair_label: pair_label || null,
      problem_statement: problem_statement || null
    });

    logger.info('[API] Direction created:', {
      id: createdDirection.id,
      context_map_id,
      context_id: context_id || 'none',
      context_group_id: context_group_id || 'none'
    });

    // Auto-record api_focus signal for direction generation
    try {
      signalCollector.recordApiFocus(
        project_id,
        {
          endpoint: '/api/directions',
          method: 'POST',
          callCount: 1,
          avgResponseTime: 0,
          errorRate: 0,
        },
        context_id || undefined,
        context_name || context_map_title
      );
    } catch {
      // Signal recording must never break the main flow
    }

    // Publish event for persona event bus
    try {
      const { personaEventBus } = require('@/lib/personas/eventBus');
      if (personaEventBus && typeof personaEventBus.publish === 'function') {
        personaEventBus.publish({
          event_type: 'custom' as const,
          source_type: 'system' as const,
          source_id: createdDirection.id,
          target_persona_id: null,
          project_id: project_id,
          payload: {
            type: 'direction_generated',
            direction_id: createdDirection.id,
            summary: summary,
            context_map_id: context_map_id,
            context_name: context_name || context_map_title,
            pair_id: pair_id || null,
            pair_label: pair_label || null,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch {
      // Event bus publishing must never break direction creation
    }

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
