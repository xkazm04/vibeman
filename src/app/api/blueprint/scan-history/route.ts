/**
 * Scan History API
 * Track and retrieve scan execution history
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  recordScanExecution,
  getRecentScans,
  getScanStatistics,
  cleanupOldHistory,
  ScanExecutionContext,
  ScanExecutionResult,
} from '@/app/features/Onboarding/sub_Blueprint/lib/scanHistoryService';
import { logger } from '@/lib/logger';

/**
 * GET /api/blueprint/scan-history
 * Retrieve scan execution history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type') || 'recent'; // 'recent' or 'stats'
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (type === 'stats') {
      const stats = getScanStatistics(projectId);
      return NextResponse.json({ success: true, stats });
    }

    const history = getRecentScans(projectId, limit);
    return NextResponse.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (error) {
    logger.error('Error fetching scan history:', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch scan history',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blueprint/scan-history
 * Record a new scan execution
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { context, result } = body as {
      context: ScanExecutionContext;
      result: ScanExecutionResult;
    };

    if (!context || !result) {
      return NextResponse.json(
        { error: 'Context and result are required' },
        { status: 400 }
      );
    }

    if (!context.projectId || !context.scanType) {
      return NextResponse.json(
        { error: 'Project ID and scan type are required in context' },
        { status: 400 }
      );
    }

    const historyEntry = await recordScanExecution(context, result);

    return NextResponse.json({
      success: true,
      historyEntry,
    });
  } catch (error) {
    logger.error('Error recording scan execution:', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record scan execution',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blueprint/scan-history
 * Cleanup old scan history entries
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const daysToKeep = parseInt(searchParams.get('daysToKeep') || '90', 10);

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const deletedCount = cleanupOldHistory(projectId, daysToKeep);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} old scan history entries`,
    });
  } catch (error) {
    logger.error('Error cleaning up scan history:', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup scan history',
      },
      { status: 500 }
    );
  }
}
