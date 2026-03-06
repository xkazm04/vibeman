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
import { withIdeasErrorHandler, IdeasErrorCode } from '@/app/features/Ideas/lib/ideasHandlers';

async function handleGet(request: NextRequest) {
  const status = scanQueueWorker.getStatus();
  return NextResponse.json({ status });
}

export const GET = withObservability(
  withIdeasErrorHandler(handleGet, IdeasErrorCode.INTERNAL_ERROR),
  '/api/scan-queue/worker'
);
