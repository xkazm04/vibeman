/**
 * Monitor Patterns API
 * Endpoints for pattern operations
 */

import { NextResponse } from 'next/server';
import { monitorDb } from '@/lib/monitor_database';
import { withObservability } from '@/lib/observability/middleware';
import { handleApiError } from '@/lib/api-errors';

async function handleGet() {
  try {
    const patterns = monitorDb.patterns.getAll();

    return NextResponse.json({
      success: true,
      patterns
    });
  } catch (error) {
    return handleApiError(error, 'Fetch patterns');
  }
}

export const GET = withObservability(handleGet, '/api/monitor/patterns');
