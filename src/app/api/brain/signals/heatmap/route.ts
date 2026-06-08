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
import { behavioralSignalRepository } from '@/app/db/repositories/behavioral-signal.repository';
import { withObservability } from '@/lib/observability/middleware';
import { parseQueryInt } from '@/lib/api-helpers/parseQueryInt';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';
import { aggregateByKey, accumulateByType } from '@/lib/brain/aggregateByKey';
import { HEATMAP_WINDOW_DAYS, MAX_WINDOW_DAYS } from '@/lib/brain/config';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return buildErrorResponse('projectId is required', { status: 400 });
    }

    const days = parseQueryInt(searchParams.get('days'), {
      default: HEATMAP_WINDOW_DAYS,
      min: 1,
      max: MAX_WINDOW_DAYS,
      paramName: 'days',
    });

    const rawData = behavioralSignalRepository.getDailyHeatmap(projectId, days);

    // Aggregate into per-day totals for heatmap cells
    const dailyMap = aggregateByKey(
      rawData,
      (row) => row.date,
      (row) => ({
        date: row.date,
        total_count: 0,
        total_weight: 0,
        by_type: {} as Record<string, { count: number; weight: number }>,
        by_context: {} as Record<string, { name: string; count: number; weight: number }>,
      }),
      (day, row) => {
        day.total_count += row.signal_count;
        day.total_weight += row.total_weight;
        accumulateByType(day.by_type, row.signal_type, row.signal_count, row.total_weight);
        if (row.context_id) {
          if (!day.by_context[row.context_id]) {
            day.by_context[row.context_id] = { name: row.context_name || row.context_id, count: 0, weight: 0 };
          }
          day.by_context[row.context_id].count += row.signal_count;
          day.by_context[row.context_id].weight += row.total_weight;
        }
      },
    );

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

    return buildSuccessResponse({
      heatmap: {
        days: days_data,
        contexts: Array.from(contextSet.entries()).map(([id, name]) => ({ id, name })),
        signal_types: Array.from(typeSet),
        window_days: days,
      },
    });
  } catch (error) {
    console.error('[API] Brain heatmap GET error:', error);
    return buildErrorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

export const GET = withObservability(handleGet, '/api/brain/signals/heatmap');
