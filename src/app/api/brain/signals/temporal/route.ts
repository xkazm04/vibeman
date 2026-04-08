/**
 * API Route: Brain Signal Temporal Aggregation
 *
 * GET /api/brain/signals/temporal - Get hour×day-of-week aggregated signal data
 *
 * Returns a grid of signal counts/weights bucketed by hour (0-23) and
 * day-of-week (0=Sun..6=Sat), with per-signal-type breakdowns.
 * Used by the TemporalRhythmHeatmap widget to visualise developer rhythms.
 *
 * Query params:
 * - projectId: string (required)
 * - days: number (optional, default 30, max 365)
 */

import { NextRequest } from 'next/server';
import { behavioralSignalDb } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';
import { parseQueryInt } from '@/lib/api-helpers/parseQueryInt';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';
import { aggregateByKey, accumulateByType } from '@/lib/brain/aggregateByKey';
import { TEMPORAL_WINDOW_DAYS, MAX_WINDOW_DAYS } from '@/lib/brain/config';

/** Aggregated cell for one (hour, dayOfWeek) slot */
interface TemporalCell {
  hour: number;
  dayOfWeek: number;
  totalCount: number;
  totalWeight: number;
  byType: Record<string, { count: number; weight: number }>;
}

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return buildErrorResponse('projectId is required', { status: 400 });
    }

    const days = parseQueryInt(searchParams.get('days'), {
      default: TEMPORAL_WINDOW_DAYS,
      min: 1,
      max: MAX_WINDOW_DAYS,
      paramName: 'days',
    });

    const rawRows = behavioralSignalDb.getTemporalAggregation(projectId, days);

    // Aggregate rows into (hour, dayOfWeek) cells with per-type breakdown
    const cellMap = aggregateByKey<typeof rawRows[number], TemporalCell>(
      rawRows,
      (row) => `${row.hour}-${row.day_of_week}`,
      (row) => ({
        hour: row.hour,
        dayOfWeek: row.day_of_week,
        totalCount: 0,
        totalWeight: 0,
        byType: {},
      }),
      (cell, row) => {
        cell.totalCount += row.signal_count;
        cell.totalWeight += row.total_weight;
        accumulateByType(cell.byType, row.signal_type, row.signal_count, row.total_weight);
      },
    );

    const cells = Array.from(cellMap.values());

    // Compute peak hours and rhythm summary
    const hourTotals = new Array(24).fill(0) as number[];
    const dayTotals = new Array(7).fill(0) as number[];
    let grandTotal = 0;

    for (const cell of cells) {
      hourTotals[cell.hour] += cell.totalCount;
      dayTotals[cell.dayOfWeek] += cell.totalCount;
      grandTotal += cell.totalCount;
    }

    // Find peak hour and day
    const peakHour = hourTotals.indexOf(Math.max(...hourTotals));
    const peakDay = dayTotals.indexOf(Math.max(...dayTotals));

    // Collect unique signal types
    const typeSet = new Set<string>();
    for (const row of rawRows) typeSet.add(row.signal_type);

    return buildSuccessResponse({
      temporal: {
        cells,
        hourTotals,
        dayTotals,
        peakHour,
        peakDay,
        grandTotal,
        signalTypes: Array.from(typeSet),
        windowDays: days,
      },
    });
  } catch (error) {
    console.error('[API] Brain temporal GET error:', error);
    return buildErrorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

export const GET = withObservability(handleGet, '/api/brain/signals/temporal');
