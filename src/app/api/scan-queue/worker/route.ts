/**
 * Scan Queue Worker Status API
 * GET: Get worker status
 *
 * For worker control, use dedicated endpoints:
 * - POST /api/scan-queue/worker/start - Start the worker
 * - DELETE /api/scan-queue/worker/stop - Stop the worker
 * - PATCH /api/scan-queue/worker/config - Update worker configuration
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

export const GET = withObservability(handleGet, '/api/scan-queue/worker');
