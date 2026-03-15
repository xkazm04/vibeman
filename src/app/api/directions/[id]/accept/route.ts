/**
 * API Route: Accept Direction
 *
 * POST /api/directions/[id]/accept
 * Accepts a direction and creates a Claude Code requirement file for implementation.
 * Delegates to DirectionAcceptanceSaga in directionAcceptanceWorkflow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import { acceptDirection } from '@/lib/ideas/directionAcceptanceWorkflow';

async function handlePost(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { projectPath } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    const outcome = acceptDirection({ directionId: id, projectPath });

    if (!outcome.success) {
      if (outcome.code === 'NOT_FOUND') {
        return NextResponse.json({ error: outcome.message }, { status: 404 });
      }
      if (outcome.code === 'ALREADY_PROCESSED') {
        const direction = directionDb.getDirectionById(id);
        return NextResponse.json(
          {
            error: outcome.message,
            direction,
            requirementName: outcome.details ?? '',
            requirementPath: direction?.requirement_path ?? '',
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: outcome.message }, { status: 500 });
    }

    logger.info('[API] Direction accepted and requirement created:', {
      directionId: id,
      requirementId: outcome.requirementName,
      requirementPath: outcome.requirementPath,
      ideaId: outcome.ideaId,
    });

    return NextResponse.json({
      success: true,
      direction: outcome.direction,
      requirementName: outcome.requirementName,
      requirementPath: outcome.requirementPath,
      ideaId: outcome.ideaId,
    });

  } catch (error) {
    logger.error('[API] Direction accept error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const POST = withObservability(withRateLimit(handlePost, '/api/directions/[id]/accept', 'strict'), '/api/directions/[id]/accept');
