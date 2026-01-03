/**
 * PUT /api/bridge/realtime/tasks/[id]/status
 * Update task status (running, completed, failed)
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { UpdateTaskStatusRequest, OffloadTaskStatus } from '@/lib/supabase/realtimeTypes';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase is not configured' },
        { status: 503 }
      );
    }

    const { id: taskId } = await context.params;
    const body = await request.json() as UpdateTaskStatusRequest;
    const { status, resultSummary, errorMessage } = body;

    const validStatuses: OffloadTaskStatus[] = ['pending', 'claimed', 'running', 'completed', 'failed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
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

    // Build update payload based on status
    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: now,
    };

    if (status === 'running') {
      updatePayload.started_at = now;
    } else if (status === 'completed' || status === 'failed') {
      updatePayload.completed_at = now;
    }

    if (resultSummary !== undefined) {
      updatePayload.result_summary = resultSummary;
    }

    if (errorMessage !== undefined) {
      updatePayload.error_message = errorMessage;
    }

    // Update task
    const { data: task, error } = await supabase
      .from('offload_tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select()
      .single();

    if (error || !task) {
      return NextResponse.json({
        success: false,
        error: error?.message || 'Task not found',
      });
    }

    // Broadcast status update event
    await supabase.from('bridge_events').insert({
      project_id: task.project_id,
      device_id: task.target_device_id,
      event_type: `task:${status}`,
      payload: {
        taskId: task.id,
        requirementName: task.requirement_name,
        status,
        resultSummary: resultSummary || null,
        errorMessage: errorMessage || null,
      },
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Update task status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bridge/realtime/tasks/[id]/status
 * Get current task status
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 503 }
      );
    }

    const { id: taskId } = await context.params;

    const supabase = createSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to create Supabase client' },
        { status: 500 }
      );
    }

    const { data: task, error } = await supabase
      .from('offload_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Get task status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
