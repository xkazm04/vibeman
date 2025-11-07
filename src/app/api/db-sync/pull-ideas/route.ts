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
    if (!isSupabaseConfigured()) {
      return buildErrorResponse(
        'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.',
        400
      );
    }

    // Perform the pull sync
    const result = await pullIdeasFromSupabase();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to sync ideas from Supabase'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ideas synced successfully from Supabase',
      recordCount: result.recordCount,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    return buildErrorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
}

/**
 * Build error response helper
 */
function buildErrorResponse(errorMessage: string, status: number): NextResponse {
  return NextResponse.json(
    { error: errorMessage },
    { status }
  );
}

// Increase the maximum duration for this route (Vercel)
export const maxDuration = 60; // 1 minute
