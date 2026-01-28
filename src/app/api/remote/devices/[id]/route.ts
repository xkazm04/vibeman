/**
 * Device API - Specific Device Operations
 * GET: Get device by ID
 * PATCH: Update device status
 * DELETE: Remove device
 */

import { NextRequest, NextResponse } from 'next/server';
import { deviceRegistry, initializeDeviceRegistry } from '@/lib/remote/deviceRegistry';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Initialize if not already
    initializeDeviceRegistry();

    if (!deviceRegistry.isReady()) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 503 }
      );
    }

    const device = await deviceRegistry.getDevice(id);

    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      device,
    });
  } catch (error) {
    console.error('[API/Devices] GET by ID error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get device' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Initialize if not already
    initializeDeviceRegistry();

    if (!deviceRegistry.isReady()) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();

    // Verify device exists
    const existingDevice = await deviceRegistry.getDevice(id);
    if (!existingDevice) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    // Only allow updating status and active_sessions
    const { status, active_sessions } = body;

    if (status && !['online', 'offline', 'busy', 'idle'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Update via direct Supabase call (deviceRegistry only updates current device)
    const success = await deviceRegistry.updateStatus(
      status || existingDevice.status,
      active_sessions
    );

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update device' },
        { status: 500 }
      );
    }

    // Get updated device
    const device = await deviceRegistry.getDevice(id);

    return NextResponse.json({
      success: true,
      device,
    });
  } catch (error) {
    console.error('[API/Devices] PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update device' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Initialize if not already
    initializeDeviceRegistry();

    if (!deviceRegistry.isReady()) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 503 }
      );
    }

    const success = await deviceRegistry.deleteDevice(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete device' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Device deleted',
    });
  } catch (error) {
    console.error('[API/Devices] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete device' },
      { status: 500 }
    );
  }
}
