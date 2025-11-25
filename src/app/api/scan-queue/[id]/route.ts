/**
 * Scan Queue Item API
 * GET: Get a specific queue item
 * PATCH: Update queue item status/progress
 * DELETE: Delete/cancel a queue item
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueDb } from '@/app/db';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Add detailed logging for debugging
    console.log('[ScanQueue API] Fetching queue item:', id);

    let queueItem;
    try {
      queueItem = scanQueueDb.getQueueItemById(id);
    } catch (dbError) {
      console.error('[ScanQueue API] Database error:', dbError);
      return createErrorResponse(
        'Database operation failed',
        dbError instanceof Error ? dbError : new Error(String(dbError)),
        500
      );
    }

    if (!queueItem) {
      console.log('[ScanQueue API] Queue item not found:', id);
      return createNotFoundResponse();
    }

    return NextResponse.json({ queueItem });
  } catch (error) {
    console.error('[ScanQueue API] Unexpected error:', error);
    return createErrorResponse('Failed to fetch queue item', error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, progress, progressMessage, currentStep, totalSteps, errorMessage } = body;

    console.log('[ScanQueue API] Updating queue item:', id, { status, progress });

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
      console.error('[ScanQueue API] Database error during update:', dbError);
      return createErrorResponse(
        'Database operation failed',
        dbError instanceof Error ? dbError : new Error(String(dbError)),
        500
      );
    }

    if (!queueItem) {
      console.log('[ScanQueue API] Queue item not found for update:', id);
      return createNotFoundResponse();
    }

    return NextResponse.json({ queueItem });
  } catch (error) {
    console.error('[ScanQueue API] Unexpected error during update:', error);
    return createErrorResponse('Failed to update queue item', error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('[ScanQueue API] Cancelling queue item:', id);

    let queueItem;
    try {
      // Update status to cancelled instead of deleting
      queueItem = scanQueueDb.updateStatus(id, 'cancelled');
    } catch (dbError) {
      console.error('[ScanQueue API] Database error during cancellation:', dbError);
      return createErrorResponse(
        'Database operation failed',
        dbError instanceof Error ? dbError : new Error(String(dbError)),
        500
      );
    }

    if (!queueItem) {
      console.log('[ScanQueue API] Queue item not found for cancellation:', id);
      return createNotFoundResponse();
    }

    return NextResponse.json({ success: true, queueItem });
  } catch (error) {
    console.error('[ScanQueue API] Unexpected error during cancellation:', error);
    return createErrorResponse('Failed to cancel queue item', error);
  }
}
