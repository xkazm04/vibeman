import { NextResponse } from 'next/server';
import { monitorServiceDb } from '@/lib/monitorServiceDb';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet() {
  try {
    const stats = await monitorServiceDb.getCallStatistics();

    return NextResponse.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/monitor/statistics');
