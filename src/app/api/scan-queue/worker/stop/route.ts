/**
 * Scan Queue Worker Stop API
 * DELETE: Stop the queue worker
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueWorker } from '@/lib/scanQueueWorker';
import { withObservability } from '@/lib/observability/middleware';

async function handleDelete(request: NextRequest) {
  try {
    scanQueueWorker.stop();
    return NextResponse.json({ success: true, message: 'Worker stopped' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to stop worker', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const DELETE = withObservability(handleDelete, '/api/scan-queue/worker/stop');
