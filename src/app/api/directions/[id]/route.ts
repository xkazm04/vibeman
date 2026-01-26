/**
 * API Route: Direction by ID
 *
 * GET /api/directions/[id] - Get single direction
 * PUT /api/directions/[id] - Update direction (reject it)
 * DELETE /api/directions/[id] - Delete direction
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { signalCollector } from '@/lib/brain/signalCollector';

async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const direction = directionDb.getDirectionById(id);

    if (!direction) {
      return NextResponse.json(
        { error: 'Direction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      direction
    });

  } catch (error) {
    logger.error('[API] Direction GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handlePut(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get existing direction
    const existingDirection = directionDb.getDirectionById(id);
    if (!existingDirection) {
      return NextResponse.json(
        { error: 'Direction not found' },
        { status: 404 }
      );
    }

    const { status, direction, summary, context_map_title } = body;

    // Handle rejection
    if (status === 'rejected') {
      const rejectedDirection = directionDb.rejectDirection(id);
      if (!rejectedDirection) {
        return NextResponse.json(
          { error: 'Failed to reject direction' },
          { status: 500 }
        );
      }

      logger.info('[API] Direction rejected:', { id });

      // Record brain signal: direction rejected
      try {
        signalCollector.recordContextFocus(existingDirection.project_id, {
          contextId: existingDirection.context_id || id,
          contextName: existingDirection.context_name || existingDirection.context_map_title,
          duration: 0,
          actions: ['reject_direction'],
        });
      } catch {
        // Signal recording must never break the main flow
      }

      return NextResponse.json({
        success: true,
        direction: rejectedDirection
      });
    }

    // General update
    const updatedDirection = directionDb.updateDirection(id, {
      status,
      direction,
      summary,
      context_map_title
    });

    if (!updatedDirection) {
      return NextResponse.json(
        { error: 'Failed to update direction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      direction: updatedDirection
    });

  } catch (error) {
    logger.error('[API] Direction PUT error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleDelete(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deleted = directionDb.deleteDirection(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Direction not found' },
        { status: 404 }
      );
    }

    logger.info('[API] Direction deleted:', { id });

    return NextResponse.json({
      success: true,
      deleted: true
    });

  } catch (error) {
    logger.error('[API] Direction DELETE error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/directions/[id]');
export const PUT = withObservability(handlePut, '/api/directions/[id]');
export const DELETE = withObservability(handleDelete, '/api/directions/[id]');
