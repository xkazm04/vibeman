import { NextRequest, NextResponse } from 'next/server';
import { generatePredictiveStandup } from '@/lib/standup/predictiveStandupEngine';
import { logger } from '@/lib/logger';

/**
 * GET /api/standup/predict?projectId=xxx
 * Generate prescriptive intelligence for the daily standup.
 * Returns goal risk assessments, context decay alerts, recommended task order,
 * predicted blockers, and velocity comparison.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const predictions = generatePredictiveStandup(projectId);

    return NextResponse.json({ success: true, data: predictions });
  } catch (error) {
    logger.error('Error in GET /api/standup/predict:', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to generate predictions' },
      { status: 500 }
    );
  }
}
