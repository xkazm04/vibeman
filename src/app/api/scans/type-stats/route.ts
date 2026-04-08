import { NextRequest, NextResponse } from 'next/server';
import { scanDb } from '@/app/db';

/**
 * GET /api/scans/type-stats?projectId=xxx
 * Returns historical stats per scan type: last scan date, avg duration,
 * acceptance rate, and total ideas generated.
 */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 }
    );
  }

  const stats = scanDb.getScanTypeStats(projectId);

  return NextResponse.json({ stats });
}
