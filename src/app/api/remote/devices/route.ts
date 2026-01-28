/**
 * Devices API
 * GET: List all devices
 * POST: Register or update a device
 */

import { NextRequest, NextResponse } from 'next/server';
import { deviceRegistry, initializeDeviceRegistry } from '@/lib/remote/deviceRegistry';
import type { DeviceRegistration } from '@/lib/remote/deviceTypes';

export async function GET(request: NextRequest) {
  try {
    // Initialize if not already
    initializeDeviceRegistry();

    if (!deviceRegistry.isReady()) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const onlineOnly = searchParams.get('online') === 'true';

    const devices = onlineOnly
      ? await deviceRegistry.getOnlineDevices()
      : await deviceRegistry.getAllDevices();

    return NextResponse.json({
      success: true,
      devices,
      count: devices.length,
    });
  } catch (error) {
    console.error('[API/Devices] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get devices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize if not already
    initializeDeviceRegistry();

    if (!deviceRegistry.isReady()) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured. Please configure Supabase in Online mode first.' },
        { status: 503 }
      );
    }

    const body = (await request.json()) as DeviceRegistration;

    // Validate required fields
    if (!body.device_id || !body.device_name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: device_id, device_name' },
        { status: 400 }
      );
    }

    const device = await deviceRegistry.registerDevice({
      device_id: body.device_id,
      device_name: body.device_name,
      device_type: body.device_type || 'desktop',
      hostname: body.hostname,
      capabilities: body.capabilities,
    });

    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Failed to register device. Make sure the vibeman_devices table exists in Supabase.' },
        { status: 500 }
      );
    }

    // Start heartbeat for this device
    deviceRegistry.startHeartbeat();

    return NextResponse.json({
      success: true,
      device,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[API/Devices] POST error:', errorMessage, error);
    return NextResponse.json(
      { success: false, error: `Failed to register device: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Initialize if not already
    initializeDeviceRegistry();

    if (!deviceRegistry.isReady()) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 503 }
      );
    }

    // Unregister the current device
    await deviceRegistry.unregisterDevice();

    return NextResponse.json({
      success: true,
      message: 'Device unregistered',
    });
  } catch (error) {
    console.error('[API/Devices] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unregister device' },
      { status: 500 }
    );
  }
}
