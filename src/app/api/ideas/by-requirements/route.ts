/**
 * @route /api/ideas/by-requirements
 * POST - Fetch ideas matching requirement IDs (screenshotApi, useTaskRunnerBatchData, useTaskColumnData)
 */
import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { createRouteHandler } from '@/lib/api-helpers/createRouteHandler';

/**
 * POST /api/ideas/by-requirements
 * Get ideas by multiple requirement_ids in a single batch request
 *
 * Request body: { requirementIds: string[] }
 * Response: { ideas: Record<string, DbIdea | null> }
 *
 * This eliminates N+1 queries when loading TaskRunner with many requirements
 */
async function handlePost(request: NextRequest) {
    const body = await request.json();
    const { requirementIds } = body;

    if (!requirementIds || !Array.isArray(requirementIds)) {
      return NextResponse.json(
        { error: 'requirementIds array is required in request body' },
        { status: 400 }
      );
    }

    // Limit to prevent abuse
    if (requirementIds.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 requirement IDs allowed per request' },
        { status: 400 }
      );
    }

    const ideas = ideaDb.getIdeasByRequirementIds(requirementIds);

    return NextResponse.json({ ideas });
}

export const POST = createRouteHandler(handlePost, {
  endpoint: '/api/ideas/by-requirements',
  method: 'POST',
});
