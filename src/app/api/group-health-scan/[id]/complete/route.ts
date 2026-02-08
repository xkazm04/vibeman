/**
 * API Route: Complete Group Health Scan
 *
 * POST /api/group-health-scan/[id]/complete - Complete scan with results
 *
 * This endpoint is called when a health scan finishes (success or failure).
 * It updates the scan record with the results and triggers git commit if enabled.
 */

import { NextRequest, NextResponse } from 'next/server';
import { groupHealthDb, contextGroupDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import type { HealthScanSummary } from '@/app/db/models/group-health.types';

async function handlePost(
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

    // Validate the scan summary
    const {
      healthScore,
      issuesFound,
      issuesFixed,
      scanSummary,
      gitCommitHash,
      gitPushed,
    } = body;

    if (typeof healthScore !== 'number' || healthScore < 0 || healthScore > 100) {
      return NextResponse.json(
        { error: 'healthScore must be a number between 0 and 100' },
        { status: 400 }
      );
    }

    // Complete the scan with results
    const completedScan = groupHealthDb.completeScan(id, {
      health_score: healthScore,
      issues_found: issuesFound || 0,
      issues_fixed: issuesFixed || 0,
      scan_summary: scanSummary as HealthScanSummary,
      git_commit_hash: gitCommitHash,
      git_pushed: gitPushed,
    });

    if (!completedScan) {
      return NextResponse.json(
        { error: 'Failed to complete scan' },
        { status: 500 }
      );
    }

    // Also update the context group with the health score
    try {
      const group = contextGroupDb.getGroupById(existingScan.group_id);
      if (group) {
        // The repository's completeScan already updates context_groups,
        // but we can do additional updates here if needed
        logger.info('[API] Updated group health score:', {
          groupId: existingScan.group_id,
          healthScore,
        });
      }
    } catch (groupError) {
      logger.warn('[API] Failed to update context group:', { groupError });
      // Don't fail the request if group update fails
    }

    logger.info('[API] Group health scan completed:', {
      scanId: id,
      groupId: existingScan.group_id,
      healthScore,
      issuesFound,
      issuesFixed,
      gitCommitHash: gitCommitHash || 'none',
    });

    return NextResponse.json({
      success: true,
      scan: completedScan,
    });
  } catch (error) {
    logger.error('[API] Group health scan complete error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/group-health-scan/[id]/complete');
