/**
 * File Write Queue API
 *
 * POST /api/file-write-queue — Process pending file writes
 * GET  /api/file-write-queue — Queue status
 */

import { NextRequest, NextResponse } from 'next/server';
import { fileWriteQueueRepository } from '@/app/db/repositories/file-write-queue.repository';
import { drainFileWriteQueue } from '@/lib/fileWriteWorker';
import { withObservability } from '@/lib/observability/middleware';

export const dynamic = 'force-dynamic';

async function handleGET() {
  const pending = fileWriteQueueRepository.countByStatus('pending');
  const writing = fileWriteQueueRepository.countByStatus('writing');
  const failed = fileWriteQueueRepository.countByStatus('failed');
  const completed = fileWriteQueueRepository.countByStatus('completed');

  return NextResponse.json({
    success: true,
    queue: { pending, writing, failed, completed },
  });
}

async function handlePOST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const maxItems = typeof body.maxItems === 'number' ? Math.min(body.maxItems, 50) : 20;

  const result = drainFileWriteQueue(maxItems);

  return NextResponse.json({
    success: true,
    ...result,
  });
}

export const GET = withObservability(handleGET, '/api/file-write-queue');
export const POST = withObservability(handlePOST, '/api/file-write-queue');
