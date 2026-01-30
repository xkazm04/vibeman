/**
 * API Route: Cancel Context Generation
 *
 * POST /api/context-generation/cancel
 * Cancels an ongoing context generation CLI execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { abortExecution } from '@/lib/claude-terminal/cli-service';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';

interface CancelRequestBody {
  executionId: string;
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json() as CancelRequestBody;
    const { executionId } = body;

    if (!executionId) {
      return NextResponse.json(
        { error: 'executionId is required' },
        { status: 400 }
      );
    }

    logger.info('[API] Cancelling context generation execution:', { executionId });

    try {
      abortExecution(executionId);
    } catch (cancelError) {
      logger.warn('[API] Failed to cancel execution (may have already completed):', { cancelError });
      // Don't return error - execution may have already finished
    }

    return NextResponse.json({
      success: true,
      message: 'Cancellation requested',
    });
  } catch (error) {
    logger.error('[API] Context generation cancel error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/context-generation/cancel');
