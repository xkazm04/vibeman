/**
 * Remote Events API
 * GET: Query events from Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getActiveRemoteConfig } from '@/lib/remote/config.server';
import type { RemoteEventType, EventsQueryParams } from '@/lib/remote/types';

export async function GET(request: NextRequest) {
  try {
    const config = getActiveRemoteConfig();

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);

    const params: EventsQueryParams = {
      project_id: searchParams.get('project_id') || undefined,
      event_type: searchParams.get('event_type') as RemoteEventType | undefined,
      since: searchParams.get('since') || undefined,
      until: searchParams.get('until') || undefined,
      limit: parseInt(searchParams.get('limit') || '100', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    // Validate limit
    if (params.limit! > 1000) {
      params.limit = 1000;
    }

    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Build query
    let query = supabase
      .from('vibeman_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params.project_id) {
      query = query.eq('project_id', params.project_id);
    }

    if (params.event_type) {
      query = query.eq('event_type', params.event_type);
    }

    if (params.since) {
      query = query.gte('created_at', params.since);
    }

    if (params.until) {
      query = query.lte('created_at', params.until);
    }

    query = query.range(params.offset!, params.offset! + params.limit! - 1);

    const { data: events, error, count } = await query;

    if (error) {
      console.error('[Remote/Events] Query error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      events: events || [],
      total: count || 0,
      has_more: (count || 0) > params.offset! + (events?.length || 0),
    });
  } catch (error) {
    console.error('[Remote/Events] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch events',
      },
      { status: 500 }
    );
  }
}
