/**
 * Sync Projects to Supabase API
 * POST: Reads local projects from SQLite and upserts them into vibeman_projects
 */

import { NextResponse } from 'next/server';
import { createRouteHandler } from '@/lib/api-helpers/createRouteHandler';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { syncProjectsToSupabase } from '@/lib/supabase/project-sync';

async function handlePost(): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured' },
      { status: 503 }
    );
  }

  const result = await syncProjectsToSupabase();

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}

export const POST = createRouteHandler(handlePost, {
  endpoint: '/api/external-requirements/sync-projects',
  method: 'POST',
  middleware: {
    rateLimit: { tier: 'standard' },
  },
});
