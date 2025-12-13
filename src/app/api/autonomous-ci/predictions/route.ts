/**
 * CI Predictions API
 * GET - Get predictions
 * POST - Create a prediction
 * PUT - Validate a prediction
 */

import { NextRequest, NextResponse } from 'next/server';
import { ciPredictionDb, buildExecutionDb } from '@/app/db';
import type { CIPredictionType } from '@/app/db/models/autonomous-ci.types';
import { logger } from '@/lib/logger';

/**
 * GET /api/autonomous-ci/predictions
 * Get predictions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const pipelineId = searchParams.get('pipelineId');
    const predictionId = searchParams.get('predictionId');
    const unvalidatedOnly = searchParams.get('unvalidatedOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Single prediction fetch
    if (predictionId) {
      const prediction = ciPredictionDb.getById(predictionId);
      if (!prediction) {
        return NextResponse.json(
          { error: 'Prediction not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ prediction });
    }

    // Predictions by pipeline
    if (pipelineId) {
      const predictions = ciPredictionDb.getByPipeline(pipelineId, limit);
      return NextResponse.json({ predictions });
    }

    // Unvalidated predictions for project
    if (projectId && unvalidatedOnly) {
      const predictions = ciPredictionDb.getUnvalidated(projectId);
      return NextResponse.json({ predictions });
    }

    // Accuracy stats
    if (projectId) {
      const stats = ciPredictionDb.getAccuracyStats(projectId);
      return NextResponse.json({ stats });
    }

    return NextResponse.json(
      { error: 'projectId, pipelineId, or predictionId is required' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('GET /api/autonomous-ci/predictions failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to fetch predictions', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/autonomous-ci/predictions
 * Create a new prediction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      pipelineId,
      buildId,
      predictionType,
      confidenceScore,
      predictionData,
      affectedFiles,
      estimatedImpact,
      recommendedAction,
    } = body;

    // Validate required fields
    if (!projectId || !pipelineId || !predictionType || !recommendedAction) {
      return NextResponse.json(
        { error: 'projectId, pipelineId, predictionType, and recommendedAction are required' },
        { status: 400 }
      );
    }

    // If buildId provided, mark build as predicted failure
    if (buildId && predictionType === 'build_failure') {
      buildExecutionDb.markPredictedFailure(buildId, confidenceScore || 50);
    }

    const prediction = ciPredictionDb.create({
      project_id: projectId,
      pipeline_id: pipelineId,
      build_id: buildId || null,
      prediction_type: predictionType as CIPredictionType,
      confidence_score: confidenceScore || 50,
      prediction_data: predictionData || {},
      affected_files: affectedFiles || null,
      estimated_impact: estimatedImpact || 'medium',
      recommended_action: recommendedAction,
    });

    return NextResponse.json({ prediction }, { status: 201 });
  } catch (error) {
    logger.error('POST /api/autonomous-ci/predictions failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to create prediction', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/autonomous-ci/predictions
 * Validate a prediction (mark as correct or incorrect)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, wasCorrect, actualOutcome } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    if (wasCorrect === undefined || !actualOutcome) {
      return NextResponse.json(
        { error: 'wasCorrect and actualOutcome are required' },
        { status: 400 }
      );
    }

    const prediction = ciPredictionDb.validate(id, wasCorrect, actualOutcome);

    if (!prediction) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ prediction });
  } catch (error) {
    logger.error('PUT /api/autonomous-ci/predictions failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to validate prediction', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/autonomous-ci/predictions
 * Delete a prediction
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

    const success = ciPredictionDb.delete(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    logger.error('DELETE /api/autonomous-ci/predictions failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to delete prediction', details: String(error) },
      { status: 500 }
    );
  }
}
