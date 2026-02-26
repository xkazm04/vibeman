/**
 * API Route: Brain Signal Heatmap
 *
 * GET /api/brain/signals/heatmap - Get daily aggregated signal data for heatmap
 *
 * Query params:
 * - projectId: string (required)
 * - days: number (optional, default 90, max 365)
 */

import { NextRequest, NextResponse } from 'next/server';
import { behavioralSignalDb } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = Math.min(parseInt(searchParams.get('days') || '90', 10), 365);

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const rawData = behavioralSignalDb.getDailyHeatmap(projectId, days);

    // Aggregate into per-day totals for heatmap cells
    const dailyMap = new Map<string, {
      date: string;
      total_count: number;
      total_weight: number;
      by_type: Record<string, { count: number; weight: number }>;
      by_context: Record<string, { name: string; count: number; weight: number }>;
    }>();

    for (const row of rawData) {
      let day = dailyMap.get(row.date);
      if (!day) {
        day = {
          date: row.date,
          total_count: 0,
          total_weight: 0,
          by_type: {},
          by_context: {},
        };
        dailyMap.set(row.date, day);
      }

      day.total_count += row.signal_count;
      day.total_weight += row.total_weight;

      // By signal type
      if (!day.by_type[row.signal_type]) {
        day.by_type[row.signal_type] = { count: 0, weight: 0 };
      }
      day.by_type[row.signal_type].count += row.signal_count;
      day.by_type[row.signal_type].weight += row.total_weight;

      // By context
      if (row.context_id) {
        if (!day.by_context[row.context_id]) {
          day.by_context[row.context_id] = { name: row.context_name || row.context_id, count: 0, weight: 0 };
        }
        day.by_context[row.context_id].count += row.signal_count;
        day.by_context[row.context_id].weight += row.total_weight;
      }
    }

    const days_data = Array.from(dailyMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    // Compute unique contexts and types seen across all data
    const contextSet = new Map<string, string>();
    const typeSet = new Set<string>();
    for (const row of rawData) {
      typeSet.add(row.signal_type);
      if (row.context_id) {
        contextSet.set(row.context_id, row.context_name || row.context_id);
      }
    }

    return NextResponse.json({
      success: true,
      heatmap: {
        days: days_data,
        contexts: Array.from(contextSet.entries()).map(([id, name]) => ({ id, name })),
        signal_types: Array.from(typeSet),
        window_days: days,
      },
    });
  } catch (error) {
    console.error('[API] Brain heatmap GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/brain/signals/heatmap');
