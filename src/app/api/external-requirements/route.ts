/**
 * External Requirements API
 * GET: Fetch visible external requirements for a project from Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandler } from '@/lib/api-helpers/createRouteHandler';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { fetchVisibleRequirements } from '@/lib/supabase/external-requirements';

async function handleGet(req: NextRequest): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured', requirements: [] },
      { status: 503 }
    );
  }

  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json(
      { success: false, error: 'projectId query parameter is required', requirements: [] },
      { status: 400 }
    );
  }

  const result = await fetchVisibleRequirements(projectId);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, requirements: [] },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    requirements: result.requirements,
    count: result.requirements.length,
  });
}

export const GET = createRouteHandler(handleGet, {
  endpoint: '/api/external-requirements',
  method: 'GET',
  middleware: {
    rateLimit: { tier: 'standard' },
  },
});
