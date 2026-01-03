/**
 * Offload Tasks API
 * GET - List tasks for a project
 * POST - Create a new offload task
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { CreateTaskResponse } from '@/lib/supabase/realtimeTypes';

/**
 * GET /api/bridge/realtime/tasks
 * List offload tasks for a project
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ tasks: [] }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // pending, claimed, running, completed, failed
    const deviceId = searchParams.get('deviceId'); // Filter by source or target device
    const direction = searchParams.get('direction'); // 'incoming' or 'outgoing'

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ tasks: [] }, { status: 200 });
    }

    let query = supabase
      .from('offload_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by device direction
    if (deviceId && direction === 'incoming') {
      // Tasks targeting this device
      query = query.eq('target_device_id', deviceId);
    } else if (deviceId && direction === 'outgoing') {
      // Tasks from this device
      query = query.eq('source_device_id', deviceId);
    }

    const { data: tasks, error } = await query.limit(100);

    if (error) {
      console.error('Failed to fetch tasks:', error);
      return NextResponse.json({ tasks: [], error: error.message }, { status: 200 });
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bridge/realtime/tasks
 * Create a new offload task (delegate to another device)
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
    const {
      projectId,
      sourceDeviceId,
      requirementName,
      requirementContent,
      contextPath,
      targetDeviceId,
      priority = 5,
      metadata = {},
    } = body;

    if (!projectId || !requirementName || !requirementContent || !sourceDeviceId) {
      return NextResponse.json(
        { success: false, error: 'projectId, sourceDeviceId, requirementName, and requirementContent are required' },
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

    const now = new Date().toISOString();

    // Create the task
    const { data: task, error } = await supabase
      .from('offload_tasks')
      .insert({
        project_id: projectId,
        source_device_id: sourceDeviceId,
        target_device_id: targetDeviceId || null,
        requirement_name: requirementName,
        requirement_content: requirementContent,
        context_path: contextPath || null,
        status: 'pending',
        priority,
        metadata,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create task:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Broadcast task creation event
    await supabase.from('bridge_events').insert({
      project_id: projectId,
      device_id: sourceDeviceId,
      event_type: 'task:created',
      payload: {
        taskId: task.id,
        requirementName,
        targetDeviceId,
        priority,
      },
      timestamp: now,
    });

    const response: CreateTaskResponse = {
      success: true,
      taskId: task.id,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
