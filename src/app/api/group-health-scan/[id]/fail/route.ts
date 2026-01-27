/**
 * API Route: Fail Group Health Scan
 *
 * POST /api/group-health-scan/[id]/fail
 * Marks a scan as failed (for cleanup/recovery)
 */

import { NextRequest, NextResponse } from 'next/server';
import { groupHealthDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';

async function handlePost(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the scan record
    const scan = groupHealthDb.getById(id);
    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Only allow failing pending/running scans
    if (scan.status === 'completed' || scan.status === 'failed') {
      return NextResponse.json({
        success: true,
        message: `Scan already ${scan.status}`,
      });
    }

    // Mark as failed
    const updated = groupHealthDb.failScan(id);

    logger.info('[API] Scan marked as failed:', {
      scanId: id,
      previousStatus: scan.status,
    });

    return NextResponse.json({
      success: true,
      scan: updated,
    });
  } catch (error) {
    logger.error('[API] Failed to fail scan:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/group-health-scan/[id]/fail');
