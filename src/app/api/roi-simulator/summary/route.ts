/**
 * API Route: ROI Simulator - Summary
 * Gets comprehensive ROI dashboard summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { roiSummaryDb } from '@/app/db';
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

    const summary = roiSummaryDb.getSummary(projectId);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    logger.error('Failed to get summary:', { data: error });
    return NextResponse.json(
      { error: 'Failed to get summary', details: String(error) },
      { status: 500 }
    );
  }
}
