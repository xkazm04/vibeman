/**
 * Scan Queue Worker API
 * GET: Get worker status
 * POST: Start the worker with optional config
 * DELETE: Stop the worker
 * PATCH: Update worker configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueWorker } from '@/lib/scanQueueWorker';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(_request: NextRequest) {
  const status = scanQueueWorker.getStatus();
  return NextResponse.json({ success: true, status });
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { config } = body;

    scanQueueWorker.start(config);
    return NextResponse.json({ success: true, message: 'Worker started' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to start worker', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleDelete(_request: NextRequest) {
  try {
    scanQueueWorker.stop();
    return NextResponse.json({ success: true, message: 'Worker stopped' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to stop worker', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handlePatch(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'config is required' },
        { status: 400 }
      );
    }

    scanQueueWorker.updateConfig(config);
    return NextResponse.json({ success: true, message: 'Worker configured' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to configure worker', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

const basePath = '/api/scan-queue/worker';

export const GET = withObservability(handleGet, basePath);
export const POST = withObservability(handlePost, basePath);
export const DELETE = withObservability(handleDelete, basePath);
export const PATCH = withObservability(handlePatch, basePath);
