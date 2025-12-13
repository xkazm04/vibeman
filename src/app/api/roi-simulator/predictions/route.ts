/**
 * API Route: ROI Simulator - Velocity Predictions
 * Gets velocity predictions for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { velocityPredictionDb } from '@/app/db';
import { logger } from '@/lib/logger';

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

    const predictions = velocityPredictionDb.getByProject(projectId);

    return NextResponse.json({
      success: true,
      predictions,
    });
  } catch (error) {
    logger.error('Failed to get predictions:', { data: error });
    return NextResponse.json(
      { error: 'Failed to get predictions', details: String(error) },
      { status: 500 }
    );
  }
}
