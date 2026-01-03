/**
 * Bridge Events API
 * GET - Query event history
 * POST - Log event and broadcast
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { EventQueryParams, EventQueryResponse } from '@/lib/supabase/realtimeTypes';

/**
 * GET /api/bridge/realtime/events
 * Query event history for a project
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { events: [], total: 0, hasMore: false },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const params: EventQueryParams = {
      projectId: searchParams.get('projectId') || '',
      since: searchParams.get('since') || undefined,
      until: searchParams.get('until') || undefined,
      type: searchParams.get('type') || undefined,
      deviceId: searchParams.get('deviceId') || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    if (!params.projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { events: [], total: 0, hasMore: false },
        { status: 200 }
      );
    }

    // Build query
    let query = supabase
      .from('bridge_events')
      .select('*', { count: 'exact' })
      .eq('project_id', params.projectId)
      .order('timestamp', { ascending: false });

    // Apply filters
    if (params.since) {
      query = query.gte('timestamp', params.since);
    }
    if (params.until) {
      query = query.lte('timestamp', params.until);
    }
    if (params.type) {
      query = query.eq('event_type', params.type);
    }
    if (params.deviceId) {
      query = query.eq('device_id', params.deviceId);
    }

    // Apply pagination
    query = query.range(
      params.offset || 0,
      (params.offset || 0) + (params.limit || 50) - 1
    );

    const { data: events, count, error } = await query;

    if (error) {
      console.error('Failed to fetch events:', error);
      return NextResponse.json(
        { events: [], total: 0, hasMore: false, error: error.message },
        { status: 200 }
      );
    }

    const total = count || 0;
    const response: EventQueryResponse = {
      events: events || [],
      total,
      hasMore: (params.offset || 0) + (events?.length || 0) < total,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bridge/realtime/events
 * Log a new event and broadcast via Supabase Realtime
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { projectId, deviceId, eventType, payload } = body;

    if (!projectId || !eventType) {
      return NextResponse.json(
        { success: false, error: 'projectId and eventType are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Failed to create Supabase client' },
        { status: 500 }
      );
    }

    const timestamp = new Date().toISOString();

    // Insert event into database
    const { data: event, error } = await supabase
      .from('bridge_events')
      .insert({
        project_id: projectId,
        device_id: deviceId || null,
        event_type: eventType,
        payload: payload || {},
        timestamp,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create event:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Broadcast via Supabase channel (realtime subscribers will receive this)
    // Note: This is handled automatically by Supabase when table has REPLICA IDENTITY FULL
    // and realtime is enabled for the table

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Post event error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
