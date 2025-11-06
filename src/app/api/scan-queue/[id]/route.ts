/**
 * Scan Queue Item API
 * GET: Get a specific queue item
 * PATCH: Update queue item status/progress
 * DELETE: Delete/cancel a queue item
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueDb } from '@/app/db';

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
    const queueItem = scanQueueDb.getQueueItemById(id);

    if (!queueItem) {
      return createNotFoundResponse();
    }

    return NextResponse.json({ queueItem });
  } catch (error) {
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

    let queueItem;

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

    if (!queueItem) {
      return createNotFoundResponse();
    }

    return NextResponse.json({ queueItem });
  } catch (error) {
    return createErrorResponse('Failed to update queue item', error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Update status to cancelled instead of deleting
    const queueItem = scanQueueDb.updateStatus(id, 'cancelled');

    if (!queueItem) {
      return createNotFoundResponse();
    }

    return NextResponse.json({ success: true, queueItem });
  } catch (error) {
    return createErrorResponse('Failed to cancel queue item', error);
  }
}
