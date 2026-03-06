/**
 * External Requirements Process API
 * POST: Trigger the unified pipeline for one or all open requirements
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandler } from '@/lib/api-helpers/createRouteHandler';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { fetchOpenRequirements } from '@/lib/supabase/external-requirements';
import { getDeviceId } from '@/lib/supabase/project-sync';
import {
  processExternalRequirement,
  processExternalRequirementQueue,
} from '@/app/features/TaskRunner/lib/externalRequirementPipeline';
import type { ExternalPipelineConfig } from '@/lib/supabase/external-types';

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured' },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { projectId, projectPath, requirementId, provider, model } = body;

  if (!projectId || !projectPath) {
    return NextResponse.json(
      { success: false, error: 'projectId and projectPath are required' },
      { status: 400 }
    );
  }

  const config: ExternalPipelineConfig = {
    deviceId: getDeviceId(),
    provider: provider || 'claude',
    model: model || 'sonnet',
    timeoutMs: 600_000,
  };

  // Process a single requirement
  if (requirementId) {
    const { requirements } = await fetchOpenRequirements(projectId, ['open', 'claimed', 'failed']);
    const requirement = requirements.find((r) => r.id === requirementId);

    if (!requirement) {
      return NextResponse.json(
        { success: false, error: `Requirement ${requirementId} not found or not available` },
        { status: 404 }
      );
    }

    const result = await processExternalRequirement(
      requirement,
      projectId,
      projectPath,
      config,
    );

    return NextResponse.json({
      success: result.success,
      result,
    });
  }

  // Process all open requirements sequentially
  const results = await processExternalRequirementQueue(
    projectId,
    projectPath,
    config,
  );

  return NextResponse.json({
    success: true,
    results,
    processed: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  });
}

export const POST = createRouteHandler(handlePost, {
  endpoint: '/api/external-requirements/process',
  method: 'POST',
  middleware: {
    rateLimit: { tier: 'expensive' },
  },
});
