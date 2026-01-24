/**
 * X-Ray API Route
 * Endpoint for managing X-Ray events and configuration
 * Now backed by SQLite persistence via obs_xray_events table
 */

import { NextRequest, NextResponse } from 'next/server';
import { xrayDb } from '@/app/db';
import { addXRayEvent, getRecentEventsFromDb, type XRayEvent } from './stream/route';
import { getLayerFromPath } from '@/app/features/Docs/sub_DocsAnalysis/lib/xrayTypes';
import { withObservability } from '@/lib/observability/middleware';

// GET - Retrieve recent events and stats from database
async function handleGet(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const since = parseInt(searchParams.get('since') || '0', 10);
    const contextId = searchParams.get('contextId') || undefined;
    const contextGroupId = searchParams.get('contextGroupId') || undefined;

    // Fetch events from database with filters
    const dbEvents = xrayDb.getFiltered({
      context_id: contextId,
      context_group_id: contextGroupId,
      since: since > 0 ? since : undefined,
      limit,
    });

    // Convert to XRayEvent format with context details
    const events = getRecentEventsFromDb(limit);

    // Get statistics from database
    const dbStats = xrayDb.getStats(since > 0 ? since : undefined);
    const layerTraffic = xrayDb.getLayerTraffic(since > 0 ? since : undefined);

    // Build layer stats from database
    const layers: Record<string, number> = {
      pages: 0,
      client: 0,
      server: 0,
      external: 0,
    };
    for (const traffic of layerTraffic) {
      const layer = traffic.target_layer || 'server';
      layers[layer] = (layers[layer] || 0) + traffic.count;
    }

    const stats = {
      totalEvents: dbStats.total_events,
      recentEvents: events.length,
      layers,
      avgLatency: dbStats.avg_duration,
      errorRate: dbStats.error_rate / 100, // Convert from percentage
      errorCount: dbStats.error_count,
      byContext: dbStats.by_context,
    };

    return NextResponse.json({
      success: true,
      events,
      stats,
    });
  } catch (error) {
    console.error('[X-Ray] Failed to fetch events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch X-Ray events' },
      { status: 500 }
    );
  }
}

// POST - Manually inject an X-Ray event (for testing or external instrumentation)
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, path, status, duration, sourceLayer, contextId, contextGroupId } = body;

    if (!path) {
      return NextResponse.json(
        { success: false, error: 'path is required' },
        { status: 400 }
      );
    }

    const targetLayer = getLayerFromPath(path);
    const timestamp = Date.now();

    // Persist to database
    const dbEvent = xrayDb.logEvent({
      api_call_id: null,
      context_id: contextId || null,
      context_group_id: contextGroupId || null,
      source_layer: (sourceLayer as 'pages' | 'client' | 'server') || 'pages',
      target_layer: targetLayer === 'external' ? 'external' : 'server',
      method: method || 'GET',
      path,
      status: status || 200,
      duration: duration || Math.floor(Math.random() * 100),
      timestamp,
    });

    // Create event for SSE notification
    const event: XRayEvent = {
      id: dbEvent.id,
      timestamp: dbEvent.timestamp,
      method: dbEvent.method,
      path: dbEvent.path,
      status: dbEvent.status,
      duration: dbEvent.duration,
      layer: targetLayer,
      sourceLayer: dbEvent.source_layer,
      targetLayer: dbEvent.target_layer,
      contextId: dbEvent.context_id,
      contextGroupId: dbEvent.context_group_id,
    };

    // Notify SSE subscribers
    addXRayEvent(event);

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('[X-Ray] Failed to add event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add X-Ray event' },
      { status: 500 }
    );
  }
}

// DELETE - Clear events from database
async function handleDelete(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const olderThanDays = parseInt(searchParams.get('olderThanDays') || '0', 10);

    let deletedCount: number;

    if (olderThanDays > 0) {
      // Delete events older than specified days (retention policy)
      deletedCount = xrayDb.cleanupOlderThan(olderThanDays);
    } else {
      // Delete all events
      deletedCount = xrayDb.deleteAll();
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} events`,
      deletedCount,
    });
  } catch (error) {
    console.error('[X-Ray] Failed to clear events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear events' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/xray');
export const POST = withObservability(handlePost, '/api/xray');
export const DELETE = withObservability(handleDelete, '/api/xray');
