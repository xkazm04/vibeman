/**
 * Goals Sync API
 * POST /api/goals/sync - Manual sync of goals to Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { batchSyncGoals, isSupabaseConfigured } from '@/lib/supabase/goalSync';
import { logger } from '@/lib/logger';
import { createErrorResponse } from '@/lib/api-helpers';
import { withObservability } from '@/lib/observability/middleware';

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return createErrorResponse('Project ID is required', 400);
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        goalsCount: 0,
        errors: ['Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'],
        configured: false,
      }, { status: 200 }); // 200 because this is expected state, not an error
    }

    // Perform batch sync
    const result = await batchSyncGoals(projectId);

    return NextResponse.json({
      ...result,
      configured: true,
    });

  } catch (error) {
    logger.error('Error in POST /api/goals/sync:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

async function handleGet() {
  try {
    // Return configuration status
    const configured = isSupabaseConfigured();

    return NextResponse.json({
      configured,
      message: configured
        ? 'Supabase is configured and ready for sync'
        : 'Supabase is not configured. Set environment variables to enable sync.',
    });

  } catch (error) {
    logger.error('Error in GET /api/goals/sync:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

export const POST = withObservability(handlePost, '/api/goals/sync');
export const GET = withObservability(handleGet, '/api/goals/sync');
