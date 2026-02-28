import { NextResponse } from 'next/server';
import { monitorDb } from '@/lib/monitor_database';
import { withObservability } from '@/lib/observability/middleware';
import { handleApiError } from '@/lib/api-errors';

async function handleGet() {
  try {
    const stats = monitorDb.calls.getStatistics();

    return NextResponse.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    return handleApiError(error, 'Fetch statistics');
  }
}

export const GET = withObservability(handleGet, '/api/monitor/statistics');
