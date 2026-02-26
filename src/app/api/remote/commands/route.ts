/**
 * Remote Commands API
 * GET: List commands
 * POST: Submit a new command
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActiveRemoteConfig } from '@/lib/remote/config.server';
import { getRemoteSupabase } from '@/lib/remote/supabaseClient';
import { commandProcessor } from '@/lib/remote/commandProcessor';
import type { RemoteCommandType, CommandStatus, SubmitCommandRequest } from '@/lib/remote/types';

/**
 * GET: List commands with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getRemoteSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status') as CommandStatus | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('vibeman_commands')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: commands, error, count } = await query;

    if (error) {
      console.error('[Remote/Commands] Query error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      commands: commands || [],
      total: count || 0,
      has_more: (count || 0) > offset + (commands?.length || 0),
    });
  } catch (error) {
    console.error('[Remote/Commands] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch commands',
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Submit a new command
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getRemoteSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as SubmitCommandRequest;

    // Validate required fields
    if (!body.project_id || !body.command_type || !body.api_key) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: project_id, command_type, api_key',
        },
        { status: 400 }
      );
    }

    // Validate command type
    const validCommandTypes: RemoteCommandType[] = [
      'create_goal',
      'update_goal',
      'delete_goal',
      'accept_idea',
      'reject_idea',
      'skip_idea',
      'start_batch',
      'pause_batch',
      'resume_batch',
      'stop_batch',
      'trigger_scan',
    ];

    if (!validCommandTypes.includes(body.command_type as RemoteCommandType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid command_type. Must be one of: ${validCommandTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate API key
    const { data: client, error: clientError } = await supabase
      .from('vibeman_clients')
      .select('id, permissions, is_active')
      .eq('api_key', body.api_key)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    if (!client.is_active) {
      return NextResponse.json(
        { success: false, error: 'API key is inactive' },
        { status: 403 }
      );
    }

    // Check permissions
    const permissions = client.permissions as string[];
    if (!permissions.includes('write_commands') && !permissions.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to submit commands' },
        { status: 403 }
      );
    }

    // Insert command
    const { data: command, error: insertError } = await supabase
      .from('vibeman_commands')
      .insert({
        client_id: client.id,
        project_id: body.project_id,
        command_type: body.command_type,
        payload: body.payload || {},
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Remote/Commands] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    // Update client last_seen_at
    await supabase
      .from('vibeman_clients')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', client.id);

    return NextResponse.json({
      success: true,
      message: 'Command submitted successfully',
      command_id: command.id,
      status: 'pending',
    });
  } catch (error) {
    console.error('[Remote/Commands] POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit command',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Process pending commands manually (triggers immediate processing)
 */
export async function PATCH() {
  try {
    const config = getActiveRemoteConfig();

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 400 }
      );
    }

    // Trigger command processing
    const processedCount = await commandProcessor.processPendingCommands();

    return NextResponse.json({
      success: true,
      processed: processedCount,
    });
  } catch (error) {
    console.error('[Remote/Commands] PATCH Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process commands',
      },
      { status: 500 }
    );
  }
}
