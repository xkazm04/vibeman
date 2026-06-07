/**
 * Brain Insight Annotations API
 * GET: Fetch annotation for an insight, or all tags for a project/globally
 * PUT: Upsert annotation (note + tags) for an insight
 * DELETE: Remove annotation from an insight
 */

import { NextRequest } from 'next/server';
import { insightAnnotationRepository } from '@/app/db/repositories/insight-annotation.repository';
import { withObservability } from '@/lib/observability/middleware';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const insightId = searchParams.get('insightId');
  const tagsOnly = searchParams.get('tags') === 'true';
  const projectId = searchParams.get('projectId');
  const scope = searchParams.get('scope');

  try {
    if (tagsOnly) {
      const tags = scope === 'global'
        ? insightAnnotationRepository.getAllTags()
        : projectId
          ? insightAnnotationRepository.getAllTagsForProject(projectId)
          : [];
      return buildSuccessResponse({ tags });
    }

    if (!insightId) {
      return buildErrorResponse('insightId required', { status: 400 });
    }

    const annotation = insightAnnotationRepository.getByInsightId(insightId);
    return buildSuccessResponse({ annotation });
  } catch (error) {
    console.error('[Insight Annotations GET] Error:', error);
    return buildErrorResponse('Failed to fetch annotation');
  }
}

async function handlePut(request: NextRequest) {
  try {
    const body = await request.json();
    const { insightId, note, tags } = body;

    if (!insightId) {
      return buildErrorResponse('insightId required', { status: 400 });
    }

    if (tags !== undefined && !Array.isArray(tags)) {
      return buildErrorResponse('tags must be an array of strings', { status: 400 });
    }

    const sanitizedTags = (tags ?? [])
      .filter((t: unknown): t is string => typeof t === 'string')
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string) => t.length > 0 && t.length <= 50)
      .slice(0, 20);

    const annotation = insightAnnotationRepository.upsert(
      insightId,
      typeof note === 'string' ? note.slice(0, 2000) : null,
      sanitizedTags,
    );

    return buildSuccessResponse({ annotation });
  } catch (error) {
    console.error('[Insight Annotations PUT] Error:', error);
    return buildErrorResponse('Failed to save annotation');
  }
}

async function handleDelete(request: NextRequest) {
  try {
    const body = await request.json();
    const { insightId } = body;

    if (!insightId) {
      return buildErrorResponse('insightId required', { status: 400 });
    }

    const deleted = insightAnnotationRepository.delete(insightId);
    return buildSuccessResponse({ deleted });
  } catch (error) {
    console.error('[Insight Annotations DELETE] Error:', error);
    return buildErrorResponse('Failed to delete annotation');
  }
}

export const GET = withObservability(handleGet, '/api/brain/insights/annotations');
export const PUT = withObservability(handlePut, '/api/brain/insights/annotations');
export const DELETE = withObservability(handleDelete, '/api/brain/insights/annotations');
