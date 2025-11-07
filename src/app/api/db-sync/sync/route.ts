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
    if (!isSupabaseConfigured()) {
      return buildErrorResponse(
        'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.',
        400
      );
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const { stopOnError = false } = body;

    // Perform the sync
    const result = await syncAllTables(stopOnError);

    if (!result.success) {
      return NextResponse.json(
        {
          ...result,
          success: false,
          message: 'Sync completed with errors',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...result,
      success: true,
      message: 'Database synced successfully',
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
export const maxDuration = 300; // 5 minutes
