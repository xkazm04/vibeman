/**
 * API Route: Group Health Scan by ID
 *
 * GET /api/group-health-scan/[id] - Get scan details
 * PUT /api/group-health-scan/[id] - Update scan (start, update progress)
 * DELETE /api/group-health-scan/[id] - Cancel/delete scan
 */

import { NextRequest, NextResponse } from 'next/server';
import { groupHealthDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const scan = groupHealthDb.getById(id);

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Parse scan_summary if it's a string
    const parsedScan = {
      ...scan,
      scan_summary: scan.scan_summary
        ? (typeof scan.scan_summary === 'string' ? JSON.parse(scan.scan_summary) : scan.scan_summary)
        : null,
    };

    return NextResponse.json({
      success: true,
      scan: parsedScan,
    });
  } catch (error) {
    logger.error('[API] Group health scan GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handlePut(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingScan = groupHealthDb.getById(id);
    if (!existingScan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // If action is 'start', update status to running
    if (body.action === 'start') {
      const scan = groupHealthDb.startScan(id);
      logger.info('[API] Group health scan started:', { id });
      return NextResponse.json({
        success: true,
        scan,
      });
    }

    // If action is 'fail', mark as failed
    if (body.action === 'fail') {
      const scan = groupHealthDb.failScan(id);
      logger.info('[API] Group health scan failed:', { id });
      return NextResponse.json({
        success: true,
        scan,
      });
    }

    // General update
    const scan = groupHealthDb.update(id, body);
    if (!scan) {
      return NextResponse.json(
        { error: 'Failed to update scan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      scan,
    });
  } catch (error) {
    logger.error('[API] Group health scan PUT error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleDelete(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingScan = groupHealthDb.getById(id);
    if (!existingScan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // If scan is running, mark it as failed instead of deleting
    if (existingScan.status === 'running') {
      const scan = groupHealthDb.failScan(id);
      logger.info('[API] Running scan cancelled:', { id });
      return NextResponse.json({
        success: true,
        cancelled: true,
        scan,
      });
    }

    // Delete the scan
    const deleted = groupHealthDb.delete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete scan' },
        { status: 500 }
      );
    }

    logger.info('[API] Group health scan deleted:', { id });

    return NextResponse.json({
      success: true,
      deleted: true,
    });
  } catch (error) {
    logger.error('[API] Group health scan DELETE error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/group-health-scan/[id]');
export const PUT = withObservability(handlePut, '/api/group-health-scan/[id]');
export const DELETE = withObservability(handleDelete, '/api/group-health-scan/[id]');
