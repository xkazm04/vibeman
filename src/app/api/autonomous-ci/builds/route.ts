/**
 * Build Executions API
 * GET - Get build history
 * POST - Create/start a new build
 * PUT - Update build status
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildExecutionDb, ciPipelineDb } from '@/app/db';
import type { BuildStatus, PipelineTriggerType } from '@/app/db/models/autonomous-ci.types';
import { logger } from '@/lib/logger';

/**
 * GET /api/autonomous-ci/builds
 * Get build history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const pipelineId = searchParams.get('pipelineId');
    const buildId = searchParams.get('buildId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const days = parseInt(searchParams.get('days') || '7', 10);

    // Single build fetch
    if (buildId) {
      const build = buildExecutionDb.getById(buildId);
      if (!build) {
        return NextResponse.json(
          { error: 'Build not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ build });
    }

    // Builds by pipeline
    if (pipelineId) {
      const builds = buildExecutionDb.getByPipeline(pipelineId, limit);
      return NextResponse.json({ builds });
    }

    // Builds by project (recent)
    if (projectId) {
      const builds = buildExecutionDb.getRecent(projectId, days);
      const trend = buildExecutionDb.getBuildTrend(projectId, 14);
      return NextResponse.json({ builds, trend });
    }

    return NextResponse.json(
      { error: 'projectId, pipelineId, or buildId is required' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('GET /api/autonomous-ci/builds failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to fetch builds', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/autonomous-ci/builds
 * Create and optionally start a new build
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      pipelineId,
      trigger,
      commitSha,
      branch,
      commitMessage,
      author,
      changedFiles,
      startImmediately,
    } = body;

    // Validate required fields
    if (!projectId || !pipelineId) {
      return NextResponse.json(
        { error: 'projectId and pipelineId are required' },
        { status: 400 }
      );
    }

    // Verify pipeline exists
    const pipeline = ciPipelineDb.getById(pipelineId);
    if (!pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      );
    }

    // Create build
    let build = buildExecutionDb.create({
      project_id: projectId,
      pipeline_id: pipelineId,
      trigger: (trigger as PipelineTriggerType) || 'manual',
      commit_sha: commitSha || null,
      branch: branch || null,
      commit_message: commitMessage || null,
      author: author || null,
      changed_files: changedFiles || null,
    });

    // Start immediately if requested
    if (startImmediately) {
      build = buildExecutionDb.start(build.id) || build;
    }

    return NextResponse.json({ build }, { status: 201 });
  } catch (error) {
    logger.error('POST /api/autonomous-ci/builds failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to create build', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/autonomous-ci/builds
 * Update build status (start, complete, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      action,
      status,
      durationMs,
      testCount,
      testPassed,
      testFailures,
      testSkipped,
      testCoverage,
      memoryPeakMb,
      cpuAvgPercent,
      buildLogPath,
      artifacts,
      errorMessage,
      errorType,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    let build;

    // Handle different actions
    if (action === 'start') {
      build = buildExecutionDb.start(id);
    } else if (action === 'complete') {
      if (!status || !durationMs) {
        return NextResponse.json(
          { error: 'status and durationMs are required for complete action' },
          { status: 400 }
        );
      }

      build = buildExecutionDb.complete(id, {
        status: status as BuildStatus,
        duration_ms: durationMs,
        test_count: testCount,
        test_passed: testPassed,
        test_failures: testFailures,
        test_skipped: testSkipped,
        test_coverage: testCoverage,
        memory_peak_mb: memoryPeakMb,
        cpu_avg_percent: cpuAvgPercent,
        build_log_path: buildLogPath,
        artifacts: artifacts,
        error_message: errorMessage,
        error_type: errorType,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "complete"' },
        { status: 400 }
      );
    }

    if (!build) {
      return NextResponse.json(
        { error: 'Build not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ build });
  } catch (error) {
    logger.error('PUT /api/autonomous-ci/builds failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to update build', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/autonomous-ci/builds
 * Delete a build
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const success = buildExecutionDb.delete(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Build not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    logger.error('DELETE /api/autonomous-ci/builds failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to delete build', details: String(error) },
      { status: 500 }
    );
  }
}
