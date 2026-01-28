/**
 * Device Heartbeat API
 * POST: Send heartbeat to update device status
 */

import { NextRequest, NextResponse } from 'next/server';
import { deviceRegistry, initializeDeviceRegistry } from '@/lib/remote/deviceRegistry';
import type { DeviceHeartbeat } from '@/lib/remote/deviceTypes';

export async function POST(request: NextRequest) {
  try {
    // Initialize if not already
    initializeDeviceRegistry();

    if (!deviceRegistry.isReady()) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 503 }
      );
    }

    const body = (await request.json()) as Partial<DeviceHeartbeat>;

    const success = await deviceRegistry.sendHeartbeat({
      status: body.status,
      active_sessions: body.active_sessions,
    });

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to send heartbeat. Device may not be registered.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Heartbeat received',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API/Devices/Heartbeat] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process heartbeat' },
      { status: 500 }
    );
  }
}
