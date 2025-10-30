import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { pullIdeasFromSupabase } from '@/lib/supabase/pull';

/**
 * POST /api/db-sync/pull-ideas
 * Pull ideas from Supabase and replace local SQLite data
 */
export async function POST() {
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

    console.log('[API] Starting ideas sync from Supabase to SQLite...');

    // Perform the pull sync
    const result = await pullIdeasFromSupabase();

    if (!result.success) {
      console.error('[API] Pull sync failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to sync ideas from Supabase'
        },
        { status: 500 }
      );
    }

    console.log(`[API] Pull sync completed. ${result.recordCount} ideas synced, ${result.deletedCount} local ideas deleted`);

    return NextResponse.json({
      success: true,
      message: 'Ideas synced successfully from Supabase',
      recordCount: result.recordCount,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('[API] Error during pull sync:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

// Increase the maximum duration for this route (Vercel)
export const maxDuration = 60; // 1 minute
