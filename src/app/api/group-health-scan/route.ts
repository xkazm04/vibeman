/**
 * API Route: Group Health Scans
 *
 * GET /api/group-health-scan?groupId=xxx - Get scans for a group
 * POST /api/group-health-scan - Start new health scan for a group
 */

import { NextRequest, NextResponse } from 'next/server';
import { groupHealthDb, contextDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (groupId) {
      // Get scans for specific group
      const scans = groupHealthDb.getByGroup(groupId, limit);
      const latestCompleted = groupHealthDb.getLatestCompletedByGroup(groupId);
      const running = groupHealthDb.getRunningByGroup(groupId);

      return NextResponse.json({
        success: true,
        scans,
        latestCompleted,
        isRunning: !!running,
        runningScan: running,
      });
    } else if (projectId) {
      // Get all scans for project
      const scans = groupHealthDb.getByProject(projectId, limit);
      const stats = groupHealthDb.getStats(projectId);

      return NextResponse.json({
        success: true,
        scans,
        stats,
      });
    } else {
      return NextResponse.json(
        { error: 'groupId or projectId query parameter is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('[API] Group health scan GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, projectId } = body;

    // Validate required fields
    if (!groupId || !projectId) {
      return NextResponse.json(
        { error: 'groupId and projectId are required' },
        { status: 400 }
      );
    }

    // Check if there's already an active scan for this group
    const existingRunning = groupHealthDb.getRunningByGroup(groupId);
    if (existingRunning) {
      // Check if it's stale (older than 10 minutes) - auto-fail it
      const startedAt = existingRunning.started_at ? new Date(existingRunning.started_at).getTime() : 0;
      const isStale = startedAt > 0 && Date.now() - startedAt > 10 * 60 * 1000;

      if (isStale) {
        logger.info('[API] Cleaning up stale running scan:', { scanId: existingRunning.id });
        groupHealthDb.failScan(existingRunning.id);
      } else {
        return NextResponse.json(
          { error: 'A scan is already running for this group', scan: existingRunning },
          { status: 409 }
        );
      }
    }

    // Also check for stale pending scans (older than 2 minutes) and clean them up
    const latestScan = groupHealthDb.getLatestByGroup(groupId);
    if (latestScan && latestScan.status === 'pending') {
      const createdAt = new Date(latestScan.created_at).getTime();
      const isStale = Date.now() - createdAt > 2 * 60 * 1000;

      if (isStale) {
        logger.info('[API] Cleaning up stale pending scan:', { scanId: latestScan.id });
        groupHealthDb.failScan(latestScan.id);
      }
    }

    // Get all contexts in this group to build file list
    const contexts = contextDb.getContextsByGroup(groupId);
    if (!contexts || contexts.length === 0) {
      return NextResponse.json(
        { error: 'No contexts found in this group' },
        { status: 400 }
      );
    }

    // Collect all file paths from contexts
    const filePaths: string[] = [];
    for (const ctx of contexts) {
      const paths = typeof ctx.file_paths === 'string'
        ? JSON.parse(ctx.file_paths)
        : ctx.file_paths;
      if (Array.isArray(paths)) {
        filePaths.push(...paths);
      }
    }

    if (filePaths.length === 0) {
      return NextResponse.json(
        { error: 'No files found in this group\'s contexts' },
        { status: 400 }
      );
    }

    // Create the scan record
    const scan = groupHealthDb.create({
      group_id: groupId,
      project_id: projectId,
    });

    logger.info('[API] Group health scan created:', {
      scanId: scan.id,
      groupId,
      fileCount: filePaths.length,
    });

    return NextResponse.json({
      success: true,
      scan,
      filePaths,
      fileCount: filePaths.length,
    });
  } catch (error) {
    logger.error('[API] Group health scan POST error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/group-health-scan');
export const POST = withObservability(handlePost, '/api/group-health-scan');
