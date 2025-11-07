import { NextResponse } from 'next/server';
import { isSupabaseConfigured, testSupabaseConnection } from '@/lib/supabase/client';
import { getSyncStatus } from '@/lib/supabase/sync';

/**
 * GET /api/db-sync/status
 * Check Supabase configuration status and get sync metadata
 */
export async function GET() {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        configured: false,
        message: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
      });
    }

    // Test the connection
    const connectionTest = await testSupabaseConnection();

    if (!connectionTest.success) {
      return NextResponse.json({
        configured: true,
        connected: false,
        error: connectionTest.error
      });
    }

    // Get sync metadata
    const syncStatus = await getSyncStatus();

    if (!syncStatus.success) {
      return NextResponse.json({
        configured: true,
        connected: true,
        error: syncStatus.error
      }, { status: 500 });
    }

    return NextResponse.json({
      configured: true,
      connected: true,
      syncMetadata: syncStatus.metadata || []
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
