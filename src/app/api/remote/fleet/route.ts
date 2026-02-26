/**
 * Fleet API
 * Device fleet management, health monitoring, and batch operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRemoteSupabase } from '@/lib/remote/supabaseClient';
import type { RemoteDevice } from '@/lib/remote/deviceTypes';
import {
  calculateHealthScore,
  type DeviceHealthMetrics,
  type HealthHistoryEntry,
  type DeviceGroup,
} from '@/lib/remote/batchDispatcher';

interface FleetOverview {
  totalDevices: number;
  onlineDevices: number;
  busyDevices: number;
  offlineDevices: number;
  avgHealthScore: number;
  avgLatencyMs: number | null;
  totalActiveSessions: number;
  totalAvailableSlots: number;
  lastUpdated: string;
}

interface FleetResponse {
  success: boolean;
  overview?: FleetOverview;
  devices?: Array<RemoteDevice & { healthMetrics?: DeviceHealthMetrics }>;
  groups?: DeviceGroup[];
  healthHistory?: Record<string, HealthHistoryEntry[]>;
  error?: string;
}

/**
 * GET: Fetch fleet overview and device list
 */
export async function GET(request: NextRequest): Promise<NextResponse<FleetResponse>> {
  try {
    const supabase = getRemoteSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const localDeviceId = searchParams.get('local_device_id');
    const includeHistory = searchParams.get('include_history') === 'true';
    const historyLimit = parseInt(searchParams.get('history_limit') || '20', 10);

    // Fetch all devices
    const { data: devices, error: devicesError } = await supabase
      .from('vibeman_devices')
      .select('*')
      .order('last_heartbeat_at', { ascending: false });

    if (devicesError) {
      console.error('[Fleet] Devices query error:', devicesError);
      return NextResponse.json(
        { success: false, error: devicesError.message },
        { status: 500 }
      );
    }

    // Mark stale devices as offline (no heartbeat in 60 seconds)
    const now = Date.now();
    const STALE_THRESHOLD_MS = 60000;

    // Fetch recent ping results for latency data
    const { data: pingResults } = await supabase
      .from('vibeman_commands')
      .select('*')
      .eq('command_type', 'ping')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(100);

    // Build latency map from pings
    const latencyMap = new Map<string, number>();
    if (pingResults) {
      for (const ping of pingResults) {
        const targetId = ping.target_device_id;
        if (targetId && !latencyMap.has(targetId)) {
          const payload = ping.payload as { latency_ms?: number } | null;
          if (payload?.latency_ms) {
            latencyMap.set(targetId, payload.latency_ms);
          }
        }
      }
    }

    // Fetch health history if requested
    const healthHistory: Record<string, HealthHistoryEntry[]> = {};

    if (includeHistory) {
      // Get healthcheck events
      const { data: healthEvents } = await supabase
        .from('vibeman_events')
        .select('*')
        .eq('event_type', 'healthcheck')
        .order('created_at', { ascending: false })
        .limit(historyLimit * (devices?.length || 1));

      if (healthEvents) {
        // Group by device
        for (const event of healthEvents) {
          const payload = event.payload as {
            device_id?: string;
            zen_mode?: boolean;
            active_sessions?: number;
            available_slots?: number;
          } | null;

          if (payload?.device_id) {
            if (!healthHistory[payload.device_id]) {
              healthHistory[payload.device_id] = [];
            }

            if (healthHistory[payload.device_id].length < historyLimit) {
              const latency = latencyMap.get(payload.device_id) ?? null;
              healthHistory[payload.device_id].push({
                timestamp: event.created_at,
                healthScore: calculateHealthScore({
                  status: payload.zen_mode ? 'online' : 'offline',
                  latencyMs: latency,
                  activeSessions: payload.active_sessions ?? 0,
                  maxSessions: (payload.active_sessions ?? 0) + (payload.available_slots ?? 4),
                  consecutiveFailures: 0,
                }),
                status: payload.zen_mode ? 'online' : 'offline',
                latencyMs: latency,
                activeSessions: payload.active_sessions ?? 0,
              });
            }
          }
        }
      }
    }

    // Process devices and calculate metrics
    const processedDevices: Array<RemoteDevice & { healthMetrics?: DeviceHealthMetrics }> = [];
    let totalHealthScore = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    let totalActiveSessions = 0;
    let totalSlots = 0;
    let onlineCount = 0;
    let busyCount = 0;
    let offlineCount = 0;

    for (const device of devices || []) {
      const lastHeartbeat = new Date(device.last_heartbeat_at).getTime();
      const isStale = now - lastHeartbeat > STALE_THRESHOLD_MS;
      const status = isStale ? 'offline' : device.status;

      const latencyMs = latencyMap.get(device.device_id) ?? null;
      const maxSessions = device.capabilities?.session_slots || 4;
      const activeSessions = device.active_sessions || 0;

      const healthScore = calculateHealthScore({
        status,
        latencyMs,
        activeSessions,
        maxSessions,
        consecutiveFailures: 0,
      });

      const healthMetrics: DeviceHealthMetrics = {
        deviceId: device.device_id,
        timestamp: new Date().toISOString(),
        status,
        activeSessions,
        maxSessions,
        latencyMs,
        healthScore,
        consecutiveFailures: 0,
      };

      processedDevices.push({
        id: device.id,
        device_id: device.device_id,
        device_name: device.device_name,
        device_type: device.device_type,
        hostname: device.hostname,
        capabilities: device.capabilities || { can_execute: true, session_slots: 4 },
        status,
        active_sessions: activeSessions,
        last_heartbeat_at: device.last_heartbeat_at,
        created_at: device.created_at,
        healthMetrics,
      });

      // Aggregate stats
      totalHealthScore += healthScore;
      totalActiveSessions += activeSessions;
      totalSlots += maxSessions;

      if (latencyMs !== null) {
        totalLatency += latencyMs;
        latencyCount++;
      }

      if (status === 'online' || status === 'idle') onlineCount++;
      else if (status === 'busy') busyCount++;
      else offlineCount++;
    }

    // Calculate overview
    const totalDevices = processedDevices.length;
    const overview: FleetOverview = {
      totalDevices,
      onlineDevices: onlineCount,
      busyDevices: busyCount,
      offlineDevices: offlineCount,
      avgHealthScore: totalDevices > 0 ? Math.round(totalHealthScore / totalDevices) : 0,
      avgLatencyMs: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : null,
      totalActiveSessions,
      totalAvailableSlots: totalSlots - totalActiveSessions,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      overview,
      devices: processedDevices,
      healthHistory: includeHistory ? healthHistory : undefined,
    });
  } catch (error) {
    console.error('[Fleet] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fleet data' },
      { status: 500 }
    );
  }
}

/**
 * POST: Execute batch operations on fleet
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, device_ids, command_type, payload, source_device_id, source_device_name } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'action is required' },
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

    switch (action) {
      case 'batch_command': {
        // Dispatch command to multiple devices
        if (!device_ids || !Array.isArray(device_ids) || device_ids.length === 0) {
          return NextResponse.json(
            { success: false, error: 'device_ids array is required' },
            { status: 400 }
          );
        }

        if (!command_type) {
          return NextResponse.json(
            { success: false, error: 'command_type is required' },
            { status: 400 }
          );
        }

        // Insert commands for each device
        const commands = device_ids.map((deviceId: string) => ({
          project_id: 'fleet',
          command_type,
          target_device_id: deviceId,
          status: 'pending',
          payload: {
            ...payload,
            source_device_id,
            source_device_name,
            batch_id: `batch-${Date.now()}`,
          },
        }));

        const { data: insertedCommands, error: insertError } = await supabase
          .from('vibeman_commands')
          .insert(commands)
          .select();

        if (insertError) {
          console.error('[Fleet] Batch command error:', insertError);
          return NextResponse.json(
            { success: false, error: insertError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Dispatched ${device_ids.length} commands`,
          command_ids: insertedCommands?.map((c) => c.id) || [],
        });
      }

      case 'health_check_all': {
        // Trigger health check for all online devices
        const { data: devices } = await supabase
          .from('vibeman_devices')
          .select('device_id')
          .neq('status', 'offline');

        if (!devices || devices.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'No online devices to check',
            checked: 0,
          });
        }

        const commands = devices.map((d) => ({
          project_id: 'fleet',
          command_type: 'healthcheck',
          target_device_id: d.device_id,
          status: 'pending',
          payload: {
            source_device_id,
            source_device_name,
          },
        }));

        const { error: insertError } = await supabase
          .from('vibeman_commands')
          .insert(commands);

        if (insertError) {
          console.error('[Fleet] Health check error:', insertError);
          return NextResponse.json(
            { success: false, error: insertError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Health check triggered for ${devices.length} devices`,
          checked: devices.length,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Fleet] POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute fleet operation' },
      { status: 500 }
    );
  }
}
