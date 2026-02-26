/**
 * Mesh Topology API
 * Returns network topology data for visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRemoteSupabase } from '@/lib/remote/supabaseClient';
import {
  buildTopologyFromDevices,
  suggestImprovements,
  type NetworkTopology,
} from '@/lib/remote/topologyBuilder';
import type { RemoteDevice } from '@/lib/remote/deviceTypes';

interface TopologyResponse {
  success: boolean;
  topology?: NetworkTopology;
  improvements?: ReturnType<typeof suggestImprovements>;
  error?: string;
}

/**
 * GET: Fetch network topology
 */
export async function GET(request: NextRequest): Promise<NextResponse<TopologyResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const localDeviceId = searchParams.get('local_device_id');
    const includeImprovements = searchParams.get('include_improvements') === 'true';

    if (!localDeviceId) {
      return NextResponse.json(
        { success: false, error: 'local_device_id is required' },
        { status: 400 }
      );
    }

    const supabase = getRemoteSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 400 }
      );
    }

    // Fetch all devices
    const { data: devices, error: devicesError } = await supabase
      .from('vibeman_devices')
      .select('*')
      .order('last_heartbeat_at', { ascending: false });

    if (devicesError) {
      console.error('[Mesh/Topology] Devices query error:', devicesError);
      return NextResponse.json(
        { success: false, error: devicesError.message },
        { status: 500 }
      );
    }

    // Mark stale devices as offline (no heartbeat in 60 seconds)
    const now = Date.now();
    const STALE_THRESHOLD_MS = 60000;

    const processedDevices: RemoteDevice[] = (devices || []).map((device) => {
      const lastHeartbeat = new Date(device.last_heartbeat_at).getTime();
      const isStale = now - lastHeartbeat > STALE_THRESHOLD_MS;

      return {
        id: device.id,
        device_id: device.device_id,
        device_name: device.device_name,
        device_type: device.device_type,
        hostname: device.hostname,
        capabilities: device.capabilities || { can_execute: true, session_slots: 4 },
        status: isStale ? 'offline' : device.status,
        active_sessions: device.active_sessions || 0,
        last_heartbeat_at: device.last_heartbeat_at,
        created_at: device.created_at,
      };
    });

    // Fetch connection metrics from recent ping commands
    const { data: pingCommands } = await supabase
      .from('vibeman_commands')
      .select('*')
      .eq('command_type', 'ping')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    // Build connection metrics map from ping results
    const connectionMetrics = new Map<string, { latencyMs: number; lastPing: string }>();

    if (pingCommands) {
      // Group by target device, take most recent
      const latestPings = new Map<string, typeof pingCommands[0]>();

      pingCommands.forEach((cmd) => {
        const targetId = cmd.target_device_id;
        if (targetId && !latestPings.has(targetId)) {
          latestPings.set(targetId, cmd);
        }
      });

      latestPings.forEach((cmd, targetId) => {
        const payload = cmd.payload as { latency_ms?: number } | null;
        if (payload?.latency_ms) {
          connectionMetrics.set(targetId, {
            latencyMs: payload.latency_ms,
            lastPing: cmd.created_at,
          });
        }
      });
    }

    // Build topology
    const topology = buildTopologyFromDevices(
      processedDevices,
      localDeviceId,
      connectionMetrics
    );

    // Get improvements if requested
    const improvements = includeImprovements ? suggestImprovements(topology) : undefined;

    return NextResponse.json({
      success: true,
      topology,
      improvements,
    });
  } catch (error) {
    console.error('[Mesh/Topology] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch topology' },
      { status: 500 }
    );
  }
}

/**
 * POST: Ping a device and record latency
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { source_device_id, target_device_id, latency_ms } = body;

    if (!source_device_id || !target_device_id) {
      return NextResponse.json(
        { success: false, error: 'source_device_id and target_device_id are required' },
        { status: 400 }
      );
    }

    const supabase = getRemoteSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 400 }
      );
    }

    // Record ping result as a completed command
    const { error: insertError } = await supabase
      .from('vibeman_commands')
      .insert({
        project_id: 'mesh',
        command_type: 'ping',
        target_device_id,
        status: 'completed',
        payload: {
          source_device_id,
          latency_ms,
          timestamp: new Date().toISOString(),
        },
      });

    if (insertError) {
      console.error('[Mesh/Topology] Ping record error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ping recorded',
    });
  } catch (error) {
    console.error('[Mesh/Topology] POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record ping' },
      { status: 500 }
    );
  }
}
