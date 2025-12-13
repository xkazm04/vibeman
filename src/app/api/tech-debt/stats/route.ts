/**
 * Technical Debt Statistics API
 * GET /api/tech-debt/stats - Get statistics for project tech debt
 */

import { NextRequest, NextResponse } from 'next/server';
import { techDebtDb } from '@/app/db';
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

    const stats = techDebtDb.getTechDebtStats(projectId);

    return NextResponse.json({ stats });
  } catch (error) {
    logger.error('Error fetching tech debt stats:', { error });
    return NextResponse.json(
      { error: 'Failed to fetch tech debt statistics', details: String(error) },
      { status: 500 }
    );
  }
}
