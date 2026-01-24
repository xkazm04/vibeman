/**
 * Scan Queue Worker Control API
 * POST: Start/stop/configure the queue worker
 * GET: Get worker status
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueWorker } from '@/lib/scanQueueWorker';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(request: NextRequest) {
  try {
    const status = scanQueueWorker.getStatus();
    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get worker status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required (start, stop, or configure)' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'start':
        scanQueueWorker.start(config);
        return NextResponse.json({ success: true, message: 'Worker started' });

      case 'stop':
        scanQueueWorker.stop();
        return NextResponse.json({ success: true, message: 'Worker stopped' });

      case 'configure':
        if (!config) {
          return NextResponse.json(
            { error: 'config is required for configure action' },
            { status: 400 }
          );
        }
        scanQueueWorker.updateConfig(config);
        return NextResponse.json({ success: true, message: 'Worker configured' });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be start, stop, or configure' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to control worker', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/scan-queue/worker');
export const POST = withObservability(handlePost, '/api/scan-queue/worker');
