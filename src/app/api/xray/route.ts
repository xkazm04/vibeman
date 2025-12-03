/**
 * X-Ray API Route
 * Endpoint for managing X-Ray events and configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { addXRayEvent, eventBuffer } from './stream/route';
import { getLayerFromPath } from '@/app/features/Docs/sub_DocsAnalysis/lib/xrayTypes';

function generateId(): string {
  return `xray_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET - Retrieve recent events and stats
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const since = parseInt(searchParams.get('since') || '0', 10);

    const events = eventBuffer
      .filter((e) => e.timestamp > since)
      .slice(-limit);

    // Calculate basic stats
    const stats = {
      totalEvents: eventBuffer.length,
      recentEvents: events.length,
      layers: {
        pages: events.filter((e) => e.targetLayer === 'pages').length,
        client: events.filter((e) => e.targetLayer === 'client').length,
        server: events.filter((e) => e.targetLayer === 'server').length,
        external: events.filter((e) => e.targetLayer === 'external').length,
      },
      avgLatency:
        events.length > 0
          ? events.reduce((sum, e) => sum + e.duration, 0) / events.length
          : 0,
      errorRate:
        events.length > 0
          ? events.filter((e) => e.status >= 400).length / events.length
          : 0,
    };

    return NextResponse.json({
      success: true,
      events,
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch X-Ray events' },
      { status: 500 }
    );
  }
}

// POST - Manually inject an X-Ray event (for testing or external instrumentation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, path, status, duration, sourceLayer } = body;

    if (!path) {
      return NextResponse.json(
        { success: false, error: 'path is required' },
        { status: 400 }
      );
    }

    const targetLayer = getLayerFromPath(path);
    const event = {
      id: generateId(),
      timestamp: Date.now(),
      method: method || 'GET',
      path,
      status: status || 200,
      duration: duration || Math.random() * 100,
      layer: targetLayer,
      sourceLayer: sourceLayer || 'pages',
      targetLayer,
    };

    addXRayEvent(event);

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to add X-Ray event' },
      { status: 500 }
    );
  }
}

// DELETE - Clear event buffer
export async function DELETE() {
  try {
    eventBuffer.length = 0;
    return NextResponse.json({
      success: true,
      message: 'Event buffer cleared',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to clear events' },
      { status: 500 }
    );
  }
}
