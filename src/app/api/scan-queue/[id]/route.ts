/**
 * Scan Queue Item API
 * GET: Get a specific queue item
 * PATCH: Update queue item status/progress
 * DELETE: Delete/cancel a queue item
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueDb } from '@/app/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const queueItem = scanQueueDb.getQueueItemById(id);

    if (!queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ queueItem });
  } catch (error) {
    console.error('Error fetching queue item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue item', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ queueItem });
  } catch (error) {
    console.error('Error updating queue item:', error);
    return NextResponse.json(
      { error: 'Failed to update queue item', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, queueItem });
  } catch (error) {
    console.error('Error cancelling queue item:', error);
    return NextResponse.json(
      { error: 'Failed to cancel queue item', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
