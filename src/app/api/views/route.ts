/**
 * Saved Views API
 * GET: List views for a project
 * POST: Create a new view
 * PUT: Update a view
 * DELETE: Delete a view
 */

import { NextRequest } from 'next/server';
import { savedViewRepository } from '@/app/db/repositories/saved-view.repository';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return buildErrorResponse('projectId is required', { status: 400 });
    }

    const views = savedViewRepository.getByProject(projectId);
    return buildSuccessResponse(views);
  } catch (error) {
    console.error('[Views API] GET error:', error);
    return buildErrorResponse('Failed to fetch views');
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, name, description, entity_types, filters, visible_columns, sort_field, sort_direction, group_by, icon, color, pinned } = body;

    if (!projectId || !name || !entity_types?.length) {
      return buildErrorResponse('projectId, name, and entity_types are required', { status: 400 });
    }

    const view = savedViewRepository.create(projectId, {
      name,
      description,
      entity_types,
      filters,
      visible_columns,
      sort_field,
      sort_direction,
      group_by,
      icon,
      color,
      pinned,
    });

    return buildSuccessResponse(view);
  } catch (error) {
    console.error('[Views API] POST error:', error);
    return buildErrorResponse('Failed to create view');
  }
}

async function handlePut(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return buildErrorResponse('id is required', { status: 400 });
    }

    // Serialize JSON fields if provided as objects
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if ((key === 'entity_types' || key === 'filters' || key === 'visible_columns') && typeof value === 'object') {
        serialized[key] = JSON.stringify(value);
      } else if (key === 'pinned' && typeof value === 'boolean') {
        serialized[key] = value ? 1 : 0;
      } else {
        serialized[key] = value;
      }
    }

    const view = savedViewRepository.update(id, serialized);
    if (!view) {
      return buildErrorResponse('View not found', { status: 404 });
    }

    return buildSuccessResponse(view);
  } catch (error) {
    console.error('[Views API] PUT error:', error);
    return buildErrorResponse('Failed to update view');
  }
}

async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return buildErrorResponse('id is required', { status: 400 });
    }

    const deleted = savedViewRepository.deleteById(id);
    return buildSuccessResponse({ deleted });
  } catch (error) {
    console.error('[Views API] DELETE error:', error);
    return buildErrorResponse('Failed to delete view');
  }
}

export const GET = withObservability(handleGet, '/api/views');
export const POST = withObservability(handlePost, '/api/views');
export const PUT = withObservability(handlePut, '/api/views');
export const DELETE = withObservability(handleDelete, '/api/views');
