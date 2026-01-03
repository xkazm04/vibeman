/**
 * POST /api/bridge/realtime/pair
 * Pair with another device using a 6-digit code
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { PairRequest, PairResponse } from '@/lib/supabase/realtimeTypes';

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json() as PairRequest;
    const { deviceId, pairingCode } = body;

    if (!deviceId || !pairingCode) {
      return NextResponse.json(
        { success: false, error: 'deviceId and pairingCode are required' },
        { status: 400 }
      );
    }

    // Validate pairing code format (6 digits)
    if (!/^\d{6}$/.test(pairingCode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid pairing code format (must be 6 digits)' },
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

    // Find device with this pairing code
    const { data: targetDevice, error: findError } = await supabase
      .from('device_sessions')
      .select('*')
      .eq('pairing_code', pairingCode)
      .eq('is_online', true)
      .neq('device_id', deviceId) // Can't pair with yourself
      .single();

    if (findError || !targetDevice) {
      return NextResponse.json<PairResponse>({
        success: false,
        error: 'Invalid or expired pairing code. Device may be offline.',
      });
    }

    // Update both devices to be paired
    const now = new Date().toISOString();

    // Update target device (the one that generated the code)
    const { error: updateTarget } = await supabase
      .from('device_sessions')
      .update({
        partner_device_id: deviceId,
        pairing_code: null, // Clear code after successful pairing
        updated_at: now,
      })
      .eq('device_id', targetDevice.device_id);

    if (updateTarget) {
      console.error('Failed to update target device:', updateTarget);
    }

    // Update requesting device
    const { error: updateRequester } = await supabase
      .from('device_sessions')
      .update({
        partner_device_id: targetDevice.device_id,
        project_id: targetDevice.project_id, // Sync project
        updated_at: now,
      })
      .eq('device_id', deviceId);

    if (updateRequester) {
      console.error('Failed to update requester device:', updateRequester);
    }

    // Broadcast pairing event
    await supabase.from('bridge_events').insert({
      project_id: targetDevice.project_id,
      device_id: deviceId,
      event_type: 'device:paired',
      payload: {
        initiatorDeviceId: deviceId,
        targetDeviceId: targetDevice.device_id,
        targetDeviceName: targetDevice.device_name,
      },
      timestamp: now,
    });

    return NextResponse.json<PairResponse>({
      success: true,
      partnerId: targetDevice.device_id,
      partnerName: targetDevice.device_name,
    });
  } catch (error) {
    console.error('Pair error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bridge/realtime/pair
 * Unpair from current partner
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase is not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

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

    // Get current device to find partner
    const { data: device } = await supabase
      .from('device_sessions')
      .select('partner_device_id, project_id')
      .eq('device_id', deviceId)
      .single();

    if (device?.partner_device_id) {
      // Clear partner's link too
      await supabase
        .from('device_sessions')
        .update({ partner_device_id: null })
        .eq('device_id', device.partner_device_id);

      // Broadcast unpair event
      if (device.project_id) {
        await supabase.from('bridge_events').insert({
          project_id: device.project_id,
          device_id: deviceId,
          event_type: 'device:unpaired',
          payload: {
            deviceId,
            formerPartnerId: device.partner_device_id,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Clear this device's partner
    await supabase
      .from('device_sessions')
      .update({ partner_device_id: null })
      .eq('device_id', deviceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unpair error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
