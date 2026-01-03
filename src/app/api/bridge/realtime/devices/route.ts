/**
 * GET /api/bridge/realtime/devices
 * Fetch devices for a project, including paired devices from other projects
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

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
    const deviceId = searchParams.get('deviceId');

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
    const { data: projectDevices, error: projectError } = await supabase
      .from('device_sessions')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_online', true)
      .order('last_seen_at', { ascending: false });

    if (projectError) {
      console.error('Failed to fetch devices:', projectError);
      return NextResponse.json(
        { configured: true, devices: [], error: projectError.message },
        { status: 200 }
      );
    }

    let devices = projectDevices || [];

    // If deviceId provided, also fetch paired device even if in different project or offline
    if (deviceId) {
      const currentDevice = devices.find(d => d.device_id === deviceId);
      const partnerId = currentDevice?.partner_device_id;

      if (partnerId) {
        // Check if partner is already in the list
        const partnerInList = devices.find(d => d.device_id === partnerId);

        if (!partnerInList) {
          // Fetch partner device regardless of project/online status
          const { data: partnerDevice } = await supabase
            .from('device_sessions')
            .select('*')
            .eq('device_id', partnerId)
            .single();

          if (partnerDevice) {
            devices = [...devices, partnerDevice];
          }
        }
      }
    }

    return NextResponse.json({
      configured: true,
      devices,
      count: devices.length,
    });
  } catch (error) {
    console.error('Get devices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
