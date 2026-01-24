/**
 * API Route: Direction Statistics
 *
 * GET /api/directions/stats?projectId=xxx
 * Get direction statistics grouped by context_map
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb } from '@/app/db';
import { DbDirection } from '@/app/db/models/types';
import { withObservability } from '@/lib/observability/middleware';

interface DirectionStatusCounts {
  pending: number;
  accepted: number;
  rejected: number;
  total: number;
  acceptanceRatio: number;
}

function calculateStatusCounts(directions: DbDirection[]): DirectionStatusCounts {
  const pending = directions.filter(d => d.status === 'pending').length;
  const accepted = directions.filter(d => d.status === 'accepted').length;
  const rejected = directions.filter(d => d.status === 'rejected').length;
  const total = directions.length;
  const acceptanceRatio = total > 0 ? Math.round((accepted / total) * 100) : 0;

  return { pending, accepted, rejected, total, acceptanceRatio };
}

function calculateContextMapStats(directions: DbDirection[]) {
  const contextMapGroups = new Map<string, { title: string; directions: DbDirection[] }>();

  directions.forEach(d => {
    const existing = contextMapGroups.get(d.context_map_id);
    if (existing) {
      existing.directions.push(d);
    } else {
      contextMapGroups.set(d.context_map_id, {
        title: d.context_map_title,
        directions: [d]
      });
    }
  });

  return Array.from(contextMapGroups.entries()).map(([contextMapId, { title, directions }]) => {
    const counts = calculateStatusCounts(directions);
    return {
      contextMapId,
      contextMapTitle: title,
      ...counts
    };
  });
}

function calculateDailyStats(directions: DbDirection[], days: number = 7) {
  const dailyMap = new Map<string, DbDirection[]>();

  // Initialize last N days
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyMap.set(dateStr, []);
  }

  // Group directions by date
  directions.forEach(d => {
    const dateStr = d.created_at.split('T')[0];
    if (dailyMap.has(dateStr)) {
      dailyMap.get(dateStr)!.push(d);
    }
  });

  // Convert to array sorted by date
  return Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dirs]) => ({
      date,
      ...calculateStatusCounts(dirs)
    }));
}

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '7', 10);

    let directions: DbDirection[];

    if (projectId) {
      directions = directionDb.getDirectionsByProject(projectId);
    } else {
      // Get all directions across all projects
      directions = [
        ...directionDb.getAllPendingDirections(),
        // For accepted/rejected we need to query per-project, so use pending as base
        // and also query individually - for now, just return pending for "all projects"
      ];

      // For proper all-projects support, we'd need a getAllDirections method
      // For now, return empty if no projectId specified
      return NextResponse.json({
        error: 'projectId query parameter is required',
        hint: 'Direction stats require a specific project'
      }, { status: 400 });
    }

    const overall = calculateStatusCounts(directions);
    const contextMaps = calculateContextMapStats(directions);
    const daily = calculateDailyStats(directions, days);

    // Group by project (for multi-project view in future)
    const projects = [{
      projectId,
      name: projectId,
      totalDirections: directions.length
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
