/**
 * API Route: Project Health Trend
 *
 * GET /api/project-health/trend?projectId=&days=30 — time-series health data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHealthTrend } from '@/lib/metrics/projectHealthEngine';

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);
  const trend = getHealthTrend(projectId, days);

  return NextResponse.json({ data: trend });
}
