/**
 * Scan Queue Item API
 * GET: Get a specific queue item
 * PATCH: Update queue item status/progress
 * DELETE: Delete/cancel a queue item
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';

// Ensure database is initialized
import '@/app/db/drivers';

/**
 * Helper to create error response
 */
function createErrorResponse(message: string, error: unknown, status: number = 500) {
  return NextResponse.json(
    {
      error: message,
      details: error instanceof Error ? error.message : 'Unknown error'
    },
    { status }
  );
}

/**
 * Helper to create not found response
 */
function createNotFoundResponse() {
  return NextResponse.json(
    { error: 'Queue item not found' },
    { status: 404 }
  );
}

async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Add detailed logging for debugging
    logger.info('[ScanQueue API] Fetching queue item:', { id });

    let queueItem;
    try {
      queueItem = scanQueueDb.getQueueItemById(id);
    } catch (dbError) {
      logger.error('[ScanQueue API] Database error:', { dbError });
      return createErrorResponse(
        'Database operation failed',
        dbError instanceof Error ? dbError : new Error(String(dbError)),
        500
      );
    }

    if (!queueItem) {
      logger.info('[ScanQueue API] Queue item not found:', { id });
      return createNotFoundResponse();
    }

    return NextResponse.json({ queueItem });
  } catch (error) {
    logger.error('[ScanQueue API] Unexpected error:', { error });
    return createErrorResponse('Failed to fetch queue item', error);
  }
}

async function handlePatch(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, progress, progressMessage, currentStep, totalSteps, errorMessage } = body;

    logger.info('[ScanQueue API] Updating queue item:', { id, arg1: { status, progress } });

    let queueItem;

    try {
      if (status !== undefined) {
        queueItem = scanQueueDb.updateStatus(id, status, errorMessage);
      } else if (progress !== undefined) {
        queueItem = scanQueueDb.updateProgress(
          id,
          progress,
          progressMessage,
          currentStep,
          totalSteps
        );
      } else {
        return NextResponse.json(
          { error: 'Either status or progress must be provided' },
          { status: 400 }
        );
      }
    } catch (dbError) {
      logger.error('[ScanQueue API] Database error during update:', { dbError });
      return createErrorResponse(
        'Database operation failed',
        dbError instanceof Error ? dbError : new Error(String(dbError)),
        500
      );
    }

    if (!queueItem) {
      logger.info('[ScanQueue API] Queue item not found for update:', { id });
      return createNotFoundResponse();
    }

    return NextResponse.json({ queueItem });
  } catch (error) {
    logger.error('[ScanQueue API] Unexpected error during update:', { error });
    return createErrorResponse('Failed to update queue item', error);
  }
}

async function handleDelete(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    logger.info('[ScanQueue API] Cancelling queue item:', { id });

    let queueItem;
    try {
      // Update status to cancelled instead of deleting
      queueItem = scanQueueDb.updateStatus(id, 'cancelled');
    } catch (dbError) {
      logger.error('[ScanQueue API] Database error during cancellation:', { dbError });
      return createErrorResponse(
        'Database operation failed',
        dbError instanceof Error ? dbError : new Error(String(dbError)),
        500
      );
    }

    if (!queueItem) {
      logger.info('[ScanQueue API] Queue item not found for cancellation:', { id });
      return createNotFoundResponse();
    }

    return NextResponse.json({ success: true, queueItem });
  } catch (error) {
    logger.error('[ScanQueue API] Unexpected error during cancellation:', { error });
    return createErrorResponse('Failed to cancel queue item', error);
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/scan-queue/[id]');
export const PATCH = withObservability(handlePatch, '/api/scan-queue/[id]');
export const DELETE = withObservability(handleDelete, '/api/scan-queue/[id]');
