/**
 * Remote Setup Status API
 * GET: Check connection status and configuration
 */

import { NextResponse } from 'next/server';
import { getConnectionStatus, getRemoteConfig } from '@/lib/remote/config.server';

export async function GET() {
  try {
    const status = await getConnectionStatus();
    const config = getRemoteConfig();

    return NextResponse.json({
      success: true,
      ...status,
      supabase_url: config?.supabase_url ? maskUrl(config.supabase_url) : null,
    });
  } catch (error) {
    console.error('[Remote/Status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        is_configured: false,
        is_connected: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    );
  }
}

/**
 * Mask URL for security (show only the project reference)
 */
function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname.split('.')[0]}.***.supabase.co`;
  } catch {
    return '***';
  }
}
