/**
 * Flaky Tests API
 * GET - Get flaky tests
 * POST - Record test result (for flaky detection)
 * PUT - Update flaky test status
 */

import { NextRequest, NextResponse } from 'next/server';
import { flakyTestDb } from '@/app/db';
import type { FlakyTestStatus } from '@/app/db/models/autonomous-ci.types';
import { logger } from '@/lib/logger';

/**
 * GET /api/autonomous-ci/flaky-tests
 * Get flaky tests
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const pipelineId = searchParams.get('pipelineId');
    const flakyTestId = searchParams.get('flakyTestId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Single flaky test fetch
    if (flakyTestId) {
      const flakyTest = flakyTestDb.getById(flakyTestId);
      if (!flakyTest) {
        return NextResponse.json(
          { error: 'Flaky test not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ flakyTest });
    }

    // Flaky tests by pipeline
    if (pipelineId) {
      const flakyTests = flakyTestDb.getByPipeline(pipelineId);
      return NextResponse.json({ flakyTests });
    }

    // Top flaky tests for project
    if (projectId) {
      const flakyTests = flakyTestDb.getTopFlaky(projectId, limit);
      return NextResponse.json({ flakyTests });
    }

    return NextResponse.json(
      { error: 'projectId, pipelineId, or flakyTestId is required' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('GET /api/autonomous-ci/flaky-tests failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to fetch flaky tests', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/autonomous-ci/flaky-tests
 * Record a test result for flaky detection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      pipelineId,
      testName,
      testFile,
      testSuite,
      passed,
      errorMessage,
    } = body;

    // Validate required fields
    if (!projectId || !pipelineId || !testName || !testFile) {
      return NextResponse.json(
        { error: 'projectId, pipelineId, testName, and testFile are required' },
        { status: 400 }
      );
    }

    if (passed === undefined) {
      return NextResponse.json(
        { error: 'passed (boolean) is required' },
        { status: 400 }
      );
    }

    const flakyTest = flakyTestDb.upsert({
      project_id: projectId,
      pipeline_id: pipelineId,
      test_name: testName,
      test_file: testFile,
      test_suite: testSuite || null,
      passed: !!passed,
      error_message: errorMessage || null,
    });

    return NextResponse.json({ flakyTest });
  } catch (error) {
    logger.error('POST /api/autonomous-ci/flaky-tests failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to record test result', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/autonomous-ci/flaky-tests
 * Update flaky test status
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, rootCause, fixSuggestion, markAutoFixed } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    let flakyTest;

    if (markAutoFixed) {
      flakyTest = flakyTestDb.markAutoFixed(id);
    } else if (status) {
      flakyTest = flakyTestDb.updateStatus(
        id,
        status as FlakyTestStatus,
        rootCause,
        fixSuggestion
      );
    } else {
      return NextResponse.json(
        { error: 'status or markAutoFixed is required' },
        { status: 400 }
      );
    }

    if (!flakyTest) {
      return NextResponse.json(
        { error: 'Flaky test not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ flakyTest });
  } catch (error) {
    logger.error('PUT /api/autonomous-ci/flaky-tests failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to update flaky test', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/autonomous-ci/flaky-tests
 * Delete a flaky test record
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

    const success = flakyTestDb.delete(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Flaky test not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    logger.error('DELETE /api/autonomous-ci/flaky-tests failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to delete flaky test', details: String(error) },
      { status: 500 }
    );
  }
}
