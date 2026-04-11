/**
 * API Route: DORA Metrics
 *
 * GET /api/metrics/dora?projectId=&days=30 — current DORA metrics + trend
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeDORAMetrics, getDORATrend } from '@/lib/metrics/doraMetricsEngine';

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);
  const current = computeDORAMetrics(projectId, days);
  const trend = getDORATrend(projectId, days * 3); // trend covers 3x the main window

  return NextResponse.json({ data: { current, trend } });
}
