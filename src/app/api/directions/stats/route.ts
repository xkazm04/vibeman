/**
 * API Route: Direction Statistics
 *
 * GET /api/directions/stats?projectId=xxx
 * Get direction statistics grouped by context_map — uses SQL aggregation
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '7', 10);

    if (!projectId) {
      return NextResponse.json({
        error: 'projectId query parameter is required',
        hint: 'Direction stats require a specific project'
      }, { status: 400 });
    }

    // Use SQL aggregation instead of loading all directions into JS
    const counts = directionDb.getDirectionCounts(projectId);
    const overall = {
      ...counts,
      acceptanceRatio: counts.total > 0 ? Math.round((counts.accepted / counts.total) * 100) : 0,
    };

    const contextMapRows = directionDb.getDirectionCountsByContextMap(projectId);
    const contextMaps = contextMapRows.map(row => ({
      contextMapId: row.context_map_id,
      contextMapTitle: row.context_map_title,
      pending: row.pending,
      accepted: row.accepted,
      rejected: row.rejected,
      total: row.total,
      acceptanceRatio: row.total > 0 ? Math.round((row.accepted / row.total) * 100) : 0,
    }));

    // Build daily stats: initialize all days, then fill from SQL results
    const dailyRows = directionDb.getDirectionDailyCounts(projectId, days);
    const dailyMap = new Map(dailyRows.map(r => [r.date, r]));

    const daily: Array<{ date: string; pending: number; accepted: number; rejected: number; total: number; acceptanceRatio: number }> = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const row = dailyMap.get(dateStr);
      if (row) {
        daily.push({
          date: dateStr,
          pending: row.pending,
          accepted: row.accepted,
          rejected: row.rejected,
          total: row.total,
          acceptanceRatio: row.total > 0 ? Math.round((row.accepted / row.total) * 100) : 0,
        });
      } else {
        daily.push({ date: dateStr, pending: 0, accepted: 0, rejected: 0, total: 0, acceptanceRatio: 0 });
      }
    }

    const projects = [{
      projectId,
      name: projectId,
      totalDirections: overall.total
    }];

    return NextResponse.json({
      success: true,
      overall,
      contextMaps,
      daily,
      projects
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch direction stats' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/directions/stats');
