import { NextRequest, NextResponse } from 'next/server';
import { contextQueries } from '../../../../lib/queries/contextQueries';
import { logger } from '@/lib/logger';
import { createErrorResponse } from '@/lib/api-helpers';
import { withObservability } from '@/lib/observability/middleware';

interface BatchMoveRequest {
  moves: Array<{
    contextId: string;
    newGroupId: string | null;
  }>;
}

// POST /api/contexts/batch-move - Batch move contexts to new groups
async function handlePost(request: NextRequest) {
  try {
    const body: BatchMoveRequest = await request.json();
    const { moves } = body;

    if (!moves || !Array.isArray(moves) || moves.length === 0) {
      return createErrorResponse('Invalid moves array', 400);
    }

    // Validate each move operation
    for (const move of moves) {
      if (!move.contextId) {
        return createErrorResponse('Each move must have a contextId', 400);
      }
    }

    const results = await contextQueries.batchMoveContexts(moves);

    return NextResponse.json({
      success: true,
      data: results,
      movedCount: results.length,
    });
  } catch (error) {
    logger.error('Failed to batch move contexts:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to batch move contexts' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/contexts/batch-move');
