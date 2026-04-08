/**
 * API Route: Hot-Writes Monitor
 *
 * GET  /api/hot-writes/monitor - Get write frequency stats, recommendations, and trends
 * POST /api/hot-writes/monitor - Trigger analysis cycle (saves snapshot + generates recommendations)
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFrequencyMonitor } from '@/lib/db/writeFrequencyMonitor';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'default';
    const view = searchParams.get('view');

    if (view === 'trends') {
      const tableName = searchParams.get('table') || undefined;
      const days = parseInt(searchParams.get('days') || '7', 10);
      const trends = writeFrequencyMonitor.getTrends(tableName, days);
      return NextResponse.json({ success: true, data: { trends } });
    }

    if (view === 'config') {
      return NextResponse.json({
        success: true,
        data: {
          config: writeFrequencyMonitor.getDefaultConfig(),
          hotTables: writeFrequencyMonitor.getHotTables(),
        },
      });
    }

    // Default: return current stats without saving snapshot
    const stats = writeFrequencyMonitor.getStats(projectId);
    const hotTables = writeFrequencyMonitor.getHotTables();

    return NextResponse.json({
      success: true,
      data: {
        stats,
        hotTables,
        totalTables: stats.length,
        hotTableCount: stats.filter(s => s.isHot).length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get write frequency data';
    logger.error('[HotWritesMonitor API] GET error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let projectId = 'default';
    let config: Record<string, number> | undefined;

    try {
      const body = await request.json();
      if (body.projectId) projectId = String(body.projectId);
      if (body.config) config = body.config;
    } catch {
      // Empty body is fine — use defaults
    }

    const result = writeFrequencyMonitor.analyze(projectId, config);

    return NextResponse.json({
      success: true,
      data: result,
      message: result.recommendations.length > 0
        ? `Found ${result.recommendations.length} recommendation(s) across ${result.stats.length} tables`
        : `Analyzed ${result.stats.length} tables — no promotion/demotion recommendations`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run write frequency analysis';
    logger.error('[HotWritesMonitor API] POST error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
