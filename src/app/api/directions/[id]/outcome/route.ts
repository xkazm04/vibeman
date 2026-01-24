/**
 * API Route: Direction Outcome
 *
 * GET /api/directions/[id]/outcome - Get outcome for a direction
 * POST /api/directions/[id]/outcome - Record execution outcome
 * PUT /api/directions/[id]/outcome - Update outcome (feedback, revert status)
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb, directionOutcomeDb } from '@/app/db';
import { outcomeTracker } from '@/lib/brain/outcomeTracker';
import { withObservability } from '@/lib/observability/middleware';

/**
 * GET /api/directions/[id]/outcome
 * Get the outcome for a direction
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify direction exists
    const direction = directionDb.getDirectionById(id);
    if (!direction) {
      return NextResponse.json(
        { success: false, error: 'Direction not found' },
        { status: 404 }
      );
    }

    // Get outcome
    const outcome = directionOutcomeDb.getByDirectionId(id);

    return NextResponse.json({
      success: true,
      outcome: outcome || null,
      hasOutcome: !!outcome,
    });
  } catch (error) {
    console.error('[API] Direction outcome GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
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
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify direction exists
    const direction = directionDb.getDirectionById(id);
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

    const outcome = directionOutcomeDb.getById(outcomeId);

    return NextResponse.json({
      success: true,
      message: 'Outcome recorded',
      outcome,
    });
  } catch (error) {
    console.error('[API] Direction outcome POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
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
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify direction exists
    const direction = directionDb.getDirectionById(id);
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

      const outcome = directionOutcomeDb.getByDirectionId(id);

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

      const outcome = directionOutcomeDb.getByDirectionId(id);

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
  } catch (error) {
    console.error('[API] Direction outcome PUT error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/directions/[id]/outcome');
export const POST = withObservability(handlePost, '/api/directions/[id]/outcome');
export const PUT = withObservability(handlePut, '/api/directions/[id]/outcome');
