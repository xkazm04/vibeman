/**
 * API Route: Direction Outcome
 *
 * GET /api/directions/[id]/outcome - Get outcome for a direction
 * POST /api/directions/[id]/outcome - Record execution outcome
 * PUT /api/directions/[id]/outcome - Update outcome (feedback, revert status)
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionOutcomeRepository } from '@/app/db/repositories/direction-outcome.repository';
import { directionRepository } from '@/app/db/repositories/direction.repository';
import { insightEffectivenessCacheRepository } from '@/app/db/repositories/insight-effectiveness-cache.repository';
import { outcomeTracker } from '@/lib/brain/outcomeTracker';
import { createParamsRouteHandler } from '@/lib/api-helpers/createRouteHandler';

/**
 * GET /api/directions/[id]/outcome
 * Get the outcome for a direction
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify direction exists
  const direction = directionRepository.getDirectionById(id);
  if (!direction) {
    return NextResponse.json(
      { success: false, error: 'Direction not found' },
      { status: 404 }
    );
  }

  // Get outcome
  const outcome = directionOutcomeRepository.getByDirectionId(id);

  return NextResponse.json({
    success: true,
    outcome: outcome || null,
    hasOutcome: !!outcome,
  });
}

/**
 * POST /api/directions/[id]/outcome
 * Record execution outcome for a direction
 *
 * Body:
 * - success: boolean (required)
 * - error?: string
 * - commitSha?: string
 * - filesChanged?: string[]
 * - linesAdded?: number
 * - linesRemoved?: number
 * - executionTimeMs?: number
 */
async function handlePost(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Verify direction exists
  const direction = directionRepository.getDirectionById(id);
  if (!direction) {
    return NextResponse.json(
      { success: false, error: 'Direction not found' },
      { status: 404 }
    );
  }

  const {
    success,
    error,
    commitSha,
    filesChanged,
    linesAdded,
    linesRemoved,
    executionTimeMs,
  } = body;

  if (typeof success !== 'boolean') {
    return NextResponse.json(
      { success: false, error: 'success (boolean) is required' },
      { status: 400 }
    );
  }

  // Record the outcome
  const outcomeId = await outcomeTracker.recordExecutionByDirection(
    id,
    direction.project_id,
    {
      success,
      error,
      commitSha,
      filesChanged,
      linesAdded,
      linesRemoved,
      executionTimeMs,
    }
  );

  if (!outcomeId) {
    return NextResponse.json(
      { success: false, error: 'Failed to record outcome' },
      { status: 500 }
    );
  }

  const outcome = directionOutcomeRepository.getById(outcomeId);

  return NextResponse.json({
    success: true,
    message: 'Outcome recorded',
    outcome,
  });
}

/**
 * PUT /api/directions/[id]/outcome
 * Update outcome (feedback or revert status)
 *
 * Body (one of):
 * - feedback: { satisfaction: 1-5, text?: string }
 * - reverted: { revertCommitSha?: string }
 */
async function handlePut(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Verify direction exists
  const direction = directionRepository.getDirectionById(id);
  if (!direction) {
    return NextResponse.json(
      { success: false, error: 'Direction not found' },
      { status: 404 }
    );
  }

  // Handle feedback update
  if (body.feedback) {
    const { satisfaction, text } = body.feedback;

    if (typeof satisfaction !== 'number' || satisfaction < 1 || satisfaction > 5) {
      return NextResponse.json(
        { success: false, error: 'feedback.satisfaction must be a number between 1 and 5' },
        { status: 400 }
      );
    }

    const recorded = outcomeTracker.recordFeedback(id, satisfaction, text);

    if (!recorded) {
      return NextResponse.json(
        { success: false, error: 'No outcome found for this direction. Execute it first.' },
        { status: 404 }
      );
    }

    const outcome = directionOutcomeRepository.getByDirectionId(id);

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded',
      outcome,
    });
  }

  // Handle revert update
  if (body.reverted !== undefined) {
    const { revertCommitSha } = body.reverted || {};

    const marked = outcomeTracker.markReverted(id, revertCommitSha);

    if (!marked) {
      return NextResponse.json(
        { success: false, error: 'No outcome found for this direction. Execute it first.' },
        { status: 404 }
      );
    }

    const outcome = directionOutcomeRepository.getByDirectionId(id);

    // Invalidate effectiveness cache since revert affects direction outcome data
    try { insightEffectivenessCacheRepository.invalidate(direction.project_id); } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      message: 'Marked as reverted',
      outcome,
    });
  }

  return NextResponse.json(
    { success: false, error: 'Request must include feedback or reverted' },
    { status: 400 }
  );
}

export const GET = createParamsRouteHandler(handleGet, {
  endpoint: '/api/directions/[id]/outcome',
  method: 'GET',
});
export const POST = createParamsRouteHandler(handlePost, {
  endpoint: '/api/directions/[id]/outcome',
  method: 'POST',
});
export const PUT = createParamsRouteHandler(handlePut, {
  endpoint: '/api/directions/[id]/outcome',
  method: 'PUT',
});
