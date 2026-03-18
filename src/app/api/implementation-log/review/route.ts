/**
 * Implementation Log Review API
 * POST /api/implementation-log/review
 *
 * Receives post-implementation review results from the post-review skill
 * and merges them into the implementation log's metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { implementationLogDb } from '@/app/db';
import { logger } from '@/lib/logger';
import type { ImplementationLogMetadata } from '@/app/db/models/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      requirementName,
      qualityScore,
      qualityNotes,
      testsPassed,
      testsRun,
      testsFailed,
      regressions,
      fixes,
    } = body;

    if (!projectId || !requirementName) {
      return NextResponse.json(
        { success: false, error: 'projectId and requirementName are required' },
        { status: 400 }
      );
    }

    // Find the implementation log for this requirement
    const log = implementationLogDb.getLogByRequirementName(projectId, requirementName);
    if (!log) {
      return NextResponse.json(
        {
          success: false,
          error: `No implementation log found for requirement: ${requirementName}`,
          message: 'This is non-blocking — continue with task completion',
        },
        { status: 404 }
      );
    }

    // Parse existing metadata and merge review results
    let metadata: ImplementationLogMetadata = {};
    if (log.metadata) {
      try {
        metadata = JSON.parse(log.metadata);
      } catch { /* start fresh */ }
    }

    metadata.review = {
      qualityScore: Math.max(1, Math.min(10, Number(qualityScore) || 5)),
      qualityNotes: String(qualityNotes || ''),
      testsPassed: Boolean(testsPassed),
      testsRun: Number(testsRun) || 0,
      testsFailed: Number(testsFailed) || 0,
      regressions: Array.isArray(regressions) ? regressions : [],
      fixes: Array.isArray(fixes) ? fixes : [],
      reviewedAt: new Date().toISOString(),
    };

    implementationLogDb.updateMetadata(log.id, JSON.stringify(metadata));

    logger.info('Implementation log review saved', {
      logId: log.id,
      projectId,
      requirementName,
      qualityScore: metadata.review.qualityScore,
    });

    return NextResponse.json({
      success: true,
      logId: log.id,
      message: 'Review results saved to implementation log',
    });
  } catch (error) {
    logger.error('Error saving implementation log review:', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save review results',
        message: 'This is non-blocking — continue with task completion',
      },
      { status: 500 }
    );
  }
}
