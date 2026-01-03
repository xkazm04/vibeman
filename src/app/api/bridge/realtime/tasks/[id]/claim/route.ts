/**
 * POST /api/bridge/realtime/tasks/[id]/claim
 * Claim a pending task for execution
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { ClaimTaskRequest } from '@/lib/supabase/realtimeTypes';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteParams) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase is not configured' },
        { status: 503 }
      );
    }

    const { id: taskId } = await context.params;
    const body = await request.json() as ClaimTaskRequest;
    const { deviceId } = body;

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'deviceId is required' },
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

    // Attempt to claim the task (only if pending and not already claimed)
    const { data: task, error } = await supabase
      .from('offload_tasks')
      .update({
        target_device_id: deviceId,
        status: 'claimed',
        claimed_at: now,
        updated_at: now,
      })
      .eq('id', taskId)
      .eq('status', 'pending') // Only claim pending tasks
      .select()
      .single();

    if (error || !task) {
      // Task may have been claimed by another device
      return NextResponse.json({
        success: false,
        error: 'Task not found or already claimed',
      });
    }

    // Broadcast claim event
    await supabase.from('bridge_events').insert({
      project_id: task.project_id,
      device_id: deviceId,
      event_type: 'task:claimed',
      payload: {
        taskId: task.id,
        claimedBy: deviceId,
        requirementName: task.requirement_name,
      },
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Claim task error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
