/**
 * Scan Queue Worker Config API
 * PATCH: Update worker configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueWorker } from '@/lib/scanQueueWorker';
import { withObservability } from '@/lib/observability/middleware';

async function handlePatch(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'config is required' },
        { status: 400 }
      );
    }

    scanQueueWorker.updateConfig(config);
    return NextResponse.json({ success: true, message: 'Worker configured' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to configure worker', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const PATCH = withObservability(handlePatch, '/api/scan-queue/worker/config');
