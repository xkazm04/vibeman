/**
 * Scan Queue Worker Start API
 * POST: Start the queue worker with optional config
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueWorker } from '@/lib/scanQueueWorker';
import { withObservability } from '@/lib/observability/middleware';

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { config } = body;

    scanQueueWorker.start(config);
    return NextResponse.json({ success: true, message: 'Worker started' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to start worker', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/scan-queue/worker/start');
