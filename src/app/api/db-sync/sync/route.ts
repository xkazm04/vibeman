import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { syncAllTables } from '@/lib/supabase/sync';

/**
 * POST /api/db-sync/sync
 * Trigger a full database sync from SQLite to Supabase
 *
 * This is a long-running operation with no timeout restrictions
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    const isConfigured = isSupabaseConfigured();

    if (!isConfigured) {
      return NextResponse.json(
        {
          error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
        },
        { status: 400 }
      );
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const { stopOnError = false } = body;

    console.log('[API] Starting database sync to Supabase...');
    console.log(`[API] Stop on error: ${stopOnError}`);

    // Perform the sync
    const result = await syncAllTables(stopOnError);

    if (!result.success) {
      console.error('[API] Sync completed with errors');
      return NextResponse.json(
        {
          success: false,
          message: 'Sync completed with errors',
          ...result
        },
        { status: 500 }
      );
    }

    console.log(`[API] Sync completed successfully. Total records: ${result.totalRecords}`);

    return NextResponse.json({
      success: true,
      message: 'Database synced successfully',
      ...result
    });

  } catch (error) {
    console.error('[API] Error during database sync:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

// Increase the maximum duration for this route (Vercel)
export const maxDuration = 300; // 5 minutes
