/**
 * API Route: Seed Observability Data
 *
 * POST /api/observability/seed
 * Creates test data for the observability dashboard
 * This is for development/testing only
 */

import { NextRequest, NextResponse } from 'next/server';
import { observabilityDb } from '@/app/db';
import { logger } from '@/lib/logger';

// Use actual Vibeman project ID from database for dashboard integration
const VIBEMAN_PROJECT_ID = process.env.VIBEMAN_PROJECT_ID || 'c32769af-72ed-4764-bd27-550d46f14bc5';

// Sample endpoints with realistic usage patterns
// NOTE: Health/status endpoints are excluded - they spam data without business value
const SAMPLE_ENDPOINTS = [
  { endpoint: '/api/ideas', method: 'GET' as const, avgTime: 45, errorRate: 0.02, callsPerDay: 150 },
  { endpoint: '/api/ideas', method: 'POST' as const, avgTime: 120, errorRate: 0.05, callsPerDay: 30 },
  { endpoint: '/api/directions', method: 'GET' as const, avgTime: 35, errorRate: 0.01, callsPerDay: 80 },
  { endpoint: '/api/directions/generate', method: 'POST' as const, avgTime: 2500, errorRate: 0.08, callsPerDay: 15 },
  { endpoint: '/api/context-map', method: 'GET' as const, avgTime: 85, errorRate: 0.01, callsPerDay: 60 },
  { endpoint: '/api/contexts', method: 'GET' as const, avgTime: 55, errorRate: 0.02, callsPerDay: 100 },
  { endpoint: '/api/contexts', method: 'POST' as const, avgTime: 150, errorRate: 0.03, callsPerDay: 20 },
  { endpoint: '/api/goals', method: 'GET' as const, avgTime: 40, errorRate: 0.01, callsPerDay: 70 },
  { endpoint: '/api/goals', method: 'POST' as const, avgTime: 180, errorRate: 0.04, callsPerDay: 10 },
  { endpoint: '/api/scan-queue', method: 'GET' as const, avgTime: 25, errorRate: 0.01, callsPerDay: 200 },
  { endpoint: '/api/scan-queue/worker', method: 'POST' as const, avgTime: 5000, errorRate: 0.15, callsPerDay: 25 },
  { endpoint: '/api/projects', method: 'GET' as const, avgTime: 30, errorRate: 0.005, callsPerDay: 120 },
  { endpoint: '/api/claude-code', method: 'GET' as const, avgTime: 50, errorRate: 0.02, callsPerDay: 90 },
  { endpoint: '/api/claude-code/requirement', method: 'POST' as const, avgTime: 200, errorRate: 0.06, callsPerDay: 35 },
  { endpoint: '/api/questions', method: 'GET' as const, avgTime: 38, errorRate: 0.01, callsPerDay: 45 },
  { endpoint: '/api/reflector/stats', method: 'GET' as const, avgTime: 150, errorRate: 0.03, callsPerDay: 40 },
];

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateResponseTime(avgTime: number): number {
  // Add some variance (±50%)
  const variance = avgTime * 0.5;
  return Math.max(1, Math.round(avgTime + (Math.random() - 0.5) * 2 * variance));
}

function shouldError(errorRate: number): boolean {
  return Math.random() < errorRate;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const days = body.days || 7;
    const clearExisting = body.clearExisting !== false;

    // Ensure config exists
    let config = observabilityDb.getConfig(VIBEMAN_PROJECT_ID);
    if (!config) {
      observabilityDb.createConfig({
        project_id: VIBEMAN_PROJECT_ID,
        enabled: true,
        provider: 'local',
        sample_rate: 1.0
      });
    } else if (!config.enabled) {
      observabilityDb.updateConfig(VIBEMAN_PROJECT_ID, { enabled: true });
    }

    // Clear existing data if requested
    if (clearExisting) {
      observabilityDb.deleteOldApiCalls(VIBEMAN_PROJECT_ID, new Date(Date.now() + 86400000).toISOString());
    }

    const now = new Date();
    let totalCalls = 0;

    // Generate data for each day
    for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(0, 0, 0, 0);

      // Generate calls throughout the day (higher during work hours)
      for (const endpoint of SAMPLE_ENDPOINTS) {
        // Adjust calls based on day (fewer on weekends)
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dailyCalls = isWeekend
          ? Math.floor(endpoint.callsPerDay * 0.3)
          : randomInRange(
              Math.floor(endpoint.callsPerDay * 0.7),
              Math.floor(endpoint.callsPerDay * 1.3)
            );

        // Distribute calls throughout the day
        for (let i = 0; i < dailyCalls; i++) {
          // More calls during work hours (9am-6pm)
          const hour = Math.random() < 0.7
            ? randomInRange(9, 18)
            : randomInRange(0, 23);

          const callTime = new Date(date);
          callTime.setHours(hour, randomInRange(0, 59), randomInRange(0, 59));

          const isError = shouldError(endpoint.errorRate);
          const statusCode = isError
            ? [400, 401, 404, 500, 503][randomInRange(0, 4)]
            : [200, 201][randomInRange(0, 1)];

          observabilityDb.logApiCall({
            project_id: VIBEMAN_PROJECT_ID,
            endpoint: endpoint.endpoint,
            method: endpoint.method,
            status_code: statusCode,
            response_time_ms: generateResponseTime(endpoint.avgTime),
            request_size_bytes: randomInRange(100, 5000),
            response_size_bytes: randomInRange(500, 50000),
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
            error_message: isError ? 'Simulated error for testing' : undefined,
            called_at: callTime.toISOString()
          });

          totalCalls++;
        }
      }
    }

    // Aggregate stats
    const aggregateCount = observabilityDb.aggregateHourlyStats(VIBEMAN_PROJECT_ID);

    logger.info('[API] Seeded observability data', {
      projectId: VIBEMAN_PROJECT_ID,
      days,
      totalCalls,
      aggregateCount
    });

    return NextResponse.json({
      success: true,
      message: `Seeded ${totalCalls} API call records for ${days} days`,
      projectId: VIBEMAN_PROJECT_ID,
      totalCalls,
      aggregateCount,
      endpoints: SAMPLE_ENDPOINTS.length
    });

  } catch (error) {
    logger.error('[API] Observability seed error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/observability/seed
 * Check if seed data exists
 */
export async function GET() {
  try {
    const hasData = observabilityDb.hasData(VIBEMAN_PROJECT_ID);
    const config = observabilityDb.getConfig(VIBEMAN_PROJECT_ID);

    if (hasData) {
      const stats = observabilityDb.getDashboardStats(VIBEMAN_PROJECT_ID, 7);
      return NextResponse.json({
        success: true,
        hasData: true,
        projectId: VIBEMAN_PROJECT_ID,
        config,
        stats
      });
    }

    return NextResponse.json({
      success: true,
      hasData: false,
      projectId: VIBEMAN_PROJECT_ID,
      message: 'No data found. POST to this endpoint to seed test data.'
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
