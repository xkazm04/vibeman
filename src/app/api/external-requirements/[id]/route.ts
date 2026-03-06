/**
 * External Requirements [id] API
 * PATCH: Update status of a specific external requirement in Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandler } from '@/lib/api-helpers/createRouteHandler';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  updateRequirementStatus,
  discardRequirement,
} from '@/lib/supabase/external-requirements';
import type { ExternalRequirementStatus } from '@/lib/supabase/external-types';

const VALID_STATUSES: ExternalRequirementStatus[] = [
  'open', 'claimed', 'in_progress', 'implemented', 'discarded', 'failed',
];

async function handlePatch(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured' },
      { status: 503 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Requirement ID is required' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { status, error_message, implementation_log_id } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  // Shortcut for discard
  if (status === 'discarded') {
    const result = await discardRequirement(id);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  }

  const result = await updateRequirementStatus(id, {
    status,
    error_message,
    implementation_log_id,
    completed_at: status === 'implemented' ? new Date().toISOString() : undefined,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}

export const PATCH = createRouteHandler(
  (req: NextRequest) => {
    // Extract params from URL path
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 1];
    return handlePatch(req, { params: Promise.resolve({ id }) });
  },
  {
    endpoint: '/api/external-requirements/[id]',
    method: 'PATCH',
    middleware: {
      rateLimit: { tier: 'standard' },
    },
  }
);
