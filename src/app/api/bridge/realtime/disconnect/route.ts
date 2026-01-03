/**
 * POST /api/bridge/realtime/disconnect
 * Clean up device session on disconnect
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
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

    // Get device info before disconnect
    const { data: device } = await supabase
      .from('device_sessions')
      .select('project_id, partner_device_id')
      .eq('device_id', deviceId)
      .single();

    // Mark device as offline
    const { error } = await supabase
      .from('device_sessions')
      .update({
        is_online: false,
        pairing_code: null,
        last_seen_at: new Date().toISOString(),
      })
      .eq('device_id', deviceId);

    if (error) {
      console.error('Failed to disconnect device:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Broadcast disconnect event
    if (device?.project_id) {
      await supabase.from('bridge_events').insert({
        project_id: device.project_id,
        device_id: deviceId,
        event_type: 'device:disconnected',
        payload: {
          deviceId,
          hadPartner: !!device.partner_device_id,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Heartbeat - Update last_seen_at
 * PUT /api/bridge/realtime/disconnect (reusing for heartbeat)
 */
export async function PUT(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false }, { status: 503 });
    }

    const body = await request.json();
    const { deviceId } = body;

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'deviceId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false }, { status: 500 });
    }

    await supabase
      .from('device_sessions')
      .update({
        is_online: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq('device_id', deviceId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
