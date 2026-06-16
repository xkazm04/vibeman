/**
 * API Route: Brain Predictions
 *
 * GET  /api/brain/predictions         - Get current predictions for a project
 * POST /api/brain/predictions         - Refresh predictions (ingest + predict)
 * PATCH /api/brain/predictions        - Resolve a prediction (accept/dismiss)
 */

import { NextRequest, NextResponse } from 'next/server';
import { predictiveIntentEngine } from '@/lib/brain/predictiveIntentEngine';
import { predictiveIntentRepository } from '@/app/db/repositories/predictive-intent.repository';
import { withObservability } from '@/lib/observability/middleware';
import { checkProjectAccess } from '@/lib/api-helpers/accessControl';

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 }
    );
  }

  try {
    // Return persisted active predictions (they carry IDs, which the UI needs to
    // accept/dismiss via PATCH). Auto-generate on first load when a transition
    // model exists but nothing has been stored yet (e.g. before the first reflection).
    let predictions = predictiveIntentRepository.getActivePredictions(projectId, 5);
    if (predictions.length === 0 && predictiveIntentRepository.getTransitionCount(projectId) > 0) {
      predictiveIntentEngine.refresh(projectId);
      predictions = predictiveIntentRepository.getActivePredictions(projectId, 5);
    }

    const accuracy = predictiveIntentRepository.getAccuracyStats(projectId, 30);
    const modelSize = predictiveIntentRepository.getTransitionCount(projectId);

    return NextResponse.json({
      success: true,
      predictions,
      accuracy,
      modelSize,
    });
  } catch (error) {
    console.error('[API] Failed to get predictions:', error);
    return NextResponse.json(
      { error: 'Failed to get predictions' },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const result = predictiveIntentEngine.refresh(projectId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[API] Failed to refresh predictions:', error);
    return NextResponse.json(
      { error: 'Failed to refresh predictions' },
      { status: 500 }
    );
  }
}

async function handlePatch(request: NextRequest) {
  try {
    const body = await request.json();
    const { predictionId, action, projectId } = body;

    if (!predictionId || !action) {
      return NextResponse.json(
        { error: 'predictionId and action are required' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const denied = checkProjectAccess(projectId, request);
    if (denied) return denied;

    if (!['accepted', 'dismissed'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "accepted" or "dismissed"' },
        { status: 400 }
      );
    }

    predictiveIntentEngine.resolvePrediction(predictionId, action);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to resolve prediction:', error);
    return NextResponse.json(
      { error: 'Failed to resolve prediction' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/brain/predictions');
export const POST = withObservability(handlePost, '/api/brain/predictions');
export const PATCH = withObservability(handlePatch, '/api/brain/predictions');
