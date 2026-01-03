/**
 * GET /api/bridge/realtime/projects
 * Fetch projects list from the local database or proxy to remote device
 *
 * Query params:
 * - partnerId: If provided, fetches projects from this remote device
 * - projectId: Filter by project ID
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { projectServiceDb } from '@/lib/projectServiceDb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partnerId');

    // If no partnerId, return local projects
    if (!partnerId) {
      const projects = await projectServiceDb.getAllProjects();
      return NextResponse.json({
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          path: p.path,
          port: p.port,
          type: p.type,
        })),
        source: 'local',
      });
    }

    // Requesting remote projects - check Supabase
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured', projects: [] },
        { status: 200 }
      );
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to create Supabase client', projects: [] },
        { status: 200 }
      );
    }

    // Find the partner device to get their project list
    // The partner device should broadcast their projects via a bridge event
    const { data: events, error } = await supabase
      .from('bridge_events')
      .select('*')
      .eq('device_id', partnerId)
      .eq('event_type', 'device:projects')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to fetch remote projects:', error);
      return NextResponse.json(
        { error: error.message, projects: [] },
        { status: 200 }
      );
    }

    // If we have a recent projects broadcast from the partner
    if (events && events.length > 0) {
      const latestEvent = events[0];
      const projects = (latestEvent.payload as { projects?: unknown[] })?.projects || [];
      return NextResponse.json({
        projects,
        source: 'remote',
        partnerId,
        lastUpdated: latestEvent.timestamp,
      });
    }

    // No projects broadcast found - return empty with explanation
    return NextResponse.json({
      projects: [],
      source: 'remote',
      partnerId,
      message: 'No project list received from partner device. Ensure partner is online and broadcasting.',
    });
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bridge/realtime/projects
 * Broadcast local projects to Supabase for remote devices to see
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { deviceId, projectId } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to create Supabase client' },
        { status: 500 }
      );
    }

    // Get local projects
    const localProjects = await projectServiceDb.getAllProjects();
    const projectsList = localProjects.map(p => ({
      id: p.id,
      name: p.name,
      path: p.path,
      port: p.port,
      type: p.type,
    }));

    // Broadcast projects to Supabase
    const { error } = await supabase.from('bridge_events').insert({
      project_id: projectId || 'global',
      device_id: deviceId,
      event_type: 'device:projects',
      payload: { projects: projectsList },
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to broadcast projects:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      projectCount: projectsList.length,
    });
  } catch (error) {
    console.error('Broadcast projects error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
