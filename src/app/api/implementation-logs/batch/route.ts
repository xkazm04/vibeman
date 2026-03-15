/**
 * API Route: Batch fetch implementation logs by IDs
 */

import { NextRequest, NextResponse } from 'next/server';
import { implementationLogRepository } from '@/app/db/repositories/implementation-log.repository';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ids must be a non-empty array' },
        { status: 400 }
      );
    }

    const logs = implementationLogRepository.getLogsByIds(ids);

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    logger.error('Error batch fetching implementation logs:', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/implementation-logs/batch');
