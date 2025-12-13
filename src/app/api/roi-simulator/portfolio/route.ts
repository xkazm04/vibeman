/**
 * API Route: ROI Simulator - Portfolio
 * Gets portfolio optimizations for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { portfolioOptimizationDb } from '@/app/db';
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

    const portfolios = portfolioOptimizationDb.getByProject(projectId);

    return NextResponse.json({
      success: true,
      portfolios,
    });
  } catch (error) {
    logger.error('Failed to get portfolios:', { data: error });
    return NextResponse.json(
      { error: 'Failed to get portfolios', details: String(error) },
      { status: 500 }
    );
  }
}
