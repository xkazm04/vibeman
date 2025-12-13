/**
 * Impact Predictions API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { impactPredictionDb } from '@/app/db';
import type { DbImpactPrediction } from '@/app/db/models/strategic-roadmap.types';
import { logger } from '@/lib/logger';

/**
 * GET /api/strategic-roadmap/predictions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const subjectType = searchParams.get('subjectType');
    const subjectId = searchParams.get('subjectId');
    const horizon = searchParams.get('horizon');

    if (!projectId && !subjectId) {
      return NextResponse.json(
        { error: 'projectId or subjectId is required' },
        { status: 400 }
      );
    }

    let predictions: DbImpactPrediction[];

    if (subjectType && subjectId) {
      predictions = impactPredictionDb.getBySubject(subjectType, subjectId);
    } else if (horizon && projectId) {
      predictions = impactPredictionDb.getByHorizon(projectId, horizon as DbImpactPrediction['prediction_horizon']);
    } else {
      predictions = impactPredictionDb.getByProject(projectId!);
    }

    return NextResponse.json({ predictions });
  } catch (error) {
    logger.error('Error fetching predictions:', { data: error });
    return NextResponse.json(
      { error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/strategic-roadmap/predictions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      subjectType,
      subjectId,
      predictionHorizon,
      debtImpact,
      velocityImpact,
      riskImpact,
      complexityImpact,
      confidenceScore,
      methodology,
      interactions,
      nashEquilibrium,
      paretoOptimal,
      simulationRuns,
      bestCaseOutcome,
      worstCaseOutcome,
      mostLikelyOutcome,
    } = body;

    if (!projectId || !subjectType || !subjectId || !predictionHorizon) {
      return NextResponse.json(
        { error: 'projectId, subjectType, subjectId, and predictionHorizon are required' },
        { status: 400 }
      );
    }

    const prediction = impactPredictionDb.create({
      project_id: projectId,
      subject_type: subjectType,
      subject_id: subjectId,
      prediction_horizon: predictionHorizon,
      predicted_at: new Date().toISOString(),
      debt_impact: debtImpact || 0,
      velocity_impact: velocityImpact || 0,
      risk_impact: riskImpact || 0,
      complexity_impact: complexityImpact || 0,
      confidence_score: confidenceScore || 50,
      methodology: methodology || '',
      interactions: JSON.stringify(interactions || []),
      nash_equilibrium: nashEquilibrium ? JSON.stringify(nashEquilibrium) : null,
      pareto_optimal: paretoOptimal ? 1 : 0,
      simulation_runs: simulationRuns || 0,
      best_case_outcome: JSON.stringify(bestCaseOutcome || {}),
      worst_case_outcome: JSON.stringify(worstCaseOutcome || {}),
      most_likely_outcome: JSON.stringify(mostLikelyOutcome || {}),
      actual_outcome: null,
      prediction_accuracy: null,
      validated_at: null,
    });

    return NextResponse.json({ prediction }, { status: 201 });
  } catch (error) {
    logger.error('Error creating prediction:', { data: error });
    return NextResponse.json(
      { error: 'Failed to create prediction' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/strategic-roadmap/predictions
 * Record actual outcome for prediction validation
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, actualOutcome, predictionAccuracy } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const prediction = impactPredictionDb.recordOutcome(
      id,
      JSON.stringify(actualOutcome || {}),
      predictionAccuracy || 0
    );

    if (!prediction) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ prediction });
  } catch (error) {
    logger.error('Error updating prediction:', { data: error });
    return NextResponse.json(
      { error: 'Failed to update prediction' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/strategic-roadmap/predictions
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const deleted = impactPredictionDb.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting prediction:', { data: error });
    return NextResponse.json(
      { error: 'Failed to delete prediction' },
      { status: 500 }
    );
  }
}
