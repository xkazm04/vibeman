/**
 * Mesh Commands API
 * Device-to-device command routing for the mesh network
 * Unlike the main commands API, this doesn't require API key authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getActiveRemoteConfig } from '@/lib/remote/config.server';

// Mesh command types (different from Butler command types)
type MeshCommandType =
  | 'healthcheck'
  | 'ping'
  | 'status_request'
  | 'batch_start'
  | 'batch_stop'
  // Direction triage commands
  | 'fetch_directions'
  | 'triage_direction'
  // Requirement management
  | 'fetch_requirements'
  | 'start_remote_batch'
  | 'get_batch_status';

interface MeshCommandRequest {
  project_id: string;
  command_type: MeshCommandType;
  payload?: Record<string, unknown>;
  target_device_id?: string | null; // null = any device, specific ID = targeted
  source_device_id?: string;
  source_device_name?: string;
}

/**
 * GET: List mesh commands (optionally filtered by device)
 */
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
    const commandId = searchParams.get('command_id');
    const targetDeviceId = searchParams.get('target_device_id');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // If command_id is specified, fetch that specific command
    if (commandId) {
      const { data: command, error } = await supabase
        .from('vibeman_commands')
        .select('*')
        .eq('id', commandId)
        .single();

      if (error) {
        console.error('[Mesh/Commands] Single command query error:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.code === 'PGRST116' ? 404 : 500 }
        );
      }

      return NextResponse.json({
        success: true,
        commands: command ? [command] : [],
      });
    }

    // Otherwise, fetch list of commands
    let query = supabase
      .from('vibeman_commands')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by target device (include null targets for broadcast)
    if (targetDeviceId) {
      query = query.or(`target_device_id.is.null,target_device_id.eq.${targetDeviceId}`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: commands, error } = await query;

    if (error) {
      console.error('[Mesh/Commands] Query error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      commands: commands || [],
    });
  } catch (error) {
    console.error('[Mesh/Commands] GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch commands' },
      { status: 500 }
    );
  }
}

/**
 * POST: Submit a mesh command (device-to-device)
 */
export async function POST(request: NextRequest) {
  try {
    const config = getActiveRemoteConfig();

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as MeshCommandRequest;

    // Validate required fields
    if (!body.command_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: command_type' },
        { status: 400 }
      );
    }

    // Validate command type
    const validCommandTypes: MeshCommandType[] = [
      'healthcheck',
      'ping',
      'status_request',
      'batch_start',
      'batch_stop',
      'fetch_directions',
      'triage_direction',
      'fetch_requirements',
      'start_remote_batch',
      'get_batch_status',
    ];

    if (!validCommandTypes.includes(body.command_type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid command_type. Must be one of: ${validCommandTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Insert command with target_device_id
    const { data: command, error: insertError } = await supabase
      .from('vibeman_commands')
      .insert({
        project_id: body.project_id || 'mesh',
        command_type: body.command_type,
        payload: {
          ...body.payload,
          source_device_id: body.source_device_id,
          source_device_name: body.source_device_name,
        },
        status: 'pending',
        target_device_id: body.target_device_id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Mesh/Commands] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    console.log('[Mesh/Commands] Command created:', command.id, body.command_type, '→', body.target_device_id || 'broadcast');

    return NextResponse.json({
      success: true,
      message: 'Command sent successfully',
      command_id: command.id,
      status: 'pending',
    });
  } catch (error) {
    console.error('[Mesh/Commands] POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send command' },
      { status: 500 }
    );
  }
}
