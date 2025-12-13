/**
 * CI Config API
 * GET - Get CI configuration for a project
 * POST/PUT - Create or update CI configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { ciConfigDb } from '@/app/db';
import type { AIAnalysisFrequency } from '@/app/db/models/autonomous-ci.types';
import { logger } from '@/lib/logger';

/**
 * GET /api/autonomous-ci/config
 * Get CI configuration for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const config = ciConfigDb.getByProject(projectId);

    return NextResponse.json({
      config,
      exists: !!config,
    });
  } catch (error) {
    logger.error('GET /api/autonomous-ci/config failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to fetch config', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/autonomous-ci/config
 * Create or update CI configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      enabled,
      autoOptimize,
      autoFixFlakyTests,
      predictiveTesting,
      selfHealing,
      aiAnalysisFrequency,
      minTestCoverage,
      maxBuildTimeSeconds,
      failureRateThreshold,
      flakinessThreshold,
      notifyOnFailure,
      notifyOnPrediction,
      notifyOnOptimization,
      optimizationRules,
      excludedTests,
    } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const config = ciConfigDb.upsert(projectId, {
      enabled,
      auto_optimize: autoOptimize,
      auto_fix_flaky_tests: autoFixFlakyTests,
      predictive_testing: predictiveTesting,
      self_healing: selfHealing,
      ai_analysis_frequency: aiAnalysisFrequency as AIAnalysisFrequency,
      min_test_coverage: minTestCoverage,
      max_build_time_seconds: maxBuildTimeSeconds,
      failure_rate_threshold: failureRateThreshold,
      flakiness_threshold: flakinessThreshold,
      notify_on_failure: notifyOnFailure,
      notify_on_prediction: notifyOnPrediction,
      notify_on_optimization: notifyOnOptimization,
      optimization_rules: optimizationRules,
      excluded_tests: excludedTests,
    });

    return NextResponse.json({ config });
  } catch (error) {
    logger.error('POST /api/autonomous-ci/config failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to save config', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/autonomous-ci/config
 * Alias for POST (upsert)
 */
export async function PUT(request: NextRequest) {
  return POST(request);
}

/**
 * DELETE /api/autonomous-ci/config
 * Delete CI configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const success = ciConfigDb.delete(projectId);

    return NextResponse.json({ deleted: success });
  } catch (error) {
    logger.error('DELETE /api/autonomous-ci/config failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to delete config', details: String(error) },
      { status: 500 }
    );
  }
}
