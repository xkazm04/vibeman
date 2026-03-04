/**
 * Brain Context API
 * Returns computed behavioral context for a project
 * Cache is managed by brainService
 */

import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { getContext } from '@/lib/brain/brainService';
import { parseQueryInt } from '@/lib/api-helpers/parseQueryInt';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const noCache = searchParams.get('noCache') === 'true';

    if (!projectId) {
      return buildErrorResponse('projectId is required', { status: 400 });
    }

    const windowDays = parseQueryInt(searchParams.get('windowDays'), {
      default: 7,
      min: 1,
      max: 90,
      paramName: 'windowDays',
    });

    const result = getContext({ projectId, windowDays, noCache });

    return buildSuccessResponse(
      { context: result.context },
      { meta: result.cached ? { cached: true } : undefined }
    );
  } catch (error) {
    console.error('Failed to get behavioral context:', error);
    return buildErrorResponse(
      error instanceof Error ? error.message : 'Failed to get behavioral context'
    );
  }
}

export const GET = withObservability(handleGET, '/api/brain/context');
