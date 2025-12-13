/**
 * Scan Predictions API
 * GET: Retrieve scan recommendations
 * POST: Generate new predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateAllPredictions,
  getTopRecommendations,
  dismissRecommendation,
} from '@/app/features/Onboarding/sub_Blueprint/lib/predictiveModel';
import { logger } from '@/lib/logger';

/**
 * GET /api/blueprint/scan-predictions
 * Retrieve top scan recommendations for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const recommendations = getTopRecommendations(projectId, limit);

    return NextResponse.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    logger.error('Error fetching scan predictions:', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch predictions',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blueprint/scan-predictions
 * Generate fresh predictions for all scan types
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const predictions = await generateAllPredictions(projectId);

    return NextResponse.json({
      success: true,
      predictions: predictions.map((p) => ({
        id: p.id,
        scanType: p.scan_type,
        contextId: p.context_id,
        recommendation: p.recommendation,
        priorityScore: p.priority_score,
        stalenessScore: p.staleness_score,
        confidenceScore: p.confidence_score,
        reasoning: p.reasoning,
        nextRecommendedAt: p.next_recommended_at,
      })),
      count: predictions.length,
    });
  } catch (error) {
    logger.error('Error generating scan predictions:', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate predictions',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blueprint/scan-predictions
 * Dismiss a recommendation
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get('predictionId');

    if (!predictionId) {
      return NextResponse.json({ error: 'Prediction ID is required' }, { status: 400 });
    }

    const success = dismissRecommendation(predictionId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Prediction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Recommendation dismissed',
    });
  } catch (error) {
    logger.error('Error dismissing prediction:', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to dismiss prediction',
      },
      { status: 500 }
    );
  }
}
