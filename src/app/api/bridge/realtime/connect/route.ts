/**
 * POST /api/bridge/realtime/connect
 * Register a device and get a pairing code for cross-device connection
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { generatePairingCode } from '@/lib/supabase/realtime';
import type { ConnectRequest, ConnectResponse, DeviceCapabilities } from '@/lib/supabase/realtimeTypes';

export async function POST(request: NextRequest) {
  try {
    // Check Supabase configuration
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase is not configured', configured: false },
        { status: 503 }
      );
    }

    const body = await request.json() as ConnectRequest;
    const { projectId, role, capabilities } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
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

    // Get or generate device identifiers (these work server-side too)
    const deviceId = body.deviceId || `server-${Date.now()}`;
    const deviceName = body.deviceName || 'Vibeman Server';
    const pairingCode = generatePairingCode();

    // Default capabilities
    const deviceCapabilities: DeviceCapabilities = capabilities || {
      canExecute: true,
      hasClaudeCode: true,
    };

    // Upsert device session
    const { data: session, error } = await supabase
      .from('device_sessions')
      .upsert(
        {
          device_id: deviceId,
          device_name: deviceName,
          project_id: projectId,
          role: role || 'active',
          pairing_code: pairingCode,
          is_online: true,
          last_seen_at: new Date().toISOString(),
          capabilities: deviceCapabilities,
        },
        {
          onConflict: 'device_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Failed to connect device:', error);
      return NextResponse.json(
        { error: 'Failed to register device session', details: error.message },
        { status: 500 }
      );
    }

    const response: ConnectResponse = {
      success: true,
      sessionId: session.id,
      pairingCode: pairingCode,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bridge/realtime/connect
 * Check connection status and get online devices for a project
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { configured: false, devices: [] },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { configured: true, devices: [], error: 'Failed to create client' },
        { status: 200 }
      );
    }

    // Get online devices for this project
    const { data: devices, error } = await supabase
      .from('device_sessions')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_online', true)
      .order('last_seen_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch devices:', error);
      return NextResponse.json(
        { configured: true, devices: [], error: error.message },
        { status: 200 }
      );
    }

    return NextResponse.json({
      configured: true,
      devices: devices || [],
      count: devices?.length || 0,
    });
  } catch (error) {
    console.error('Get devices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
