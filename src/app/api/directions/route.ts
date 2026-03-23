/**
 * API Route: Directions
 *
 * GET /api/directions?projectId=xxx
 * POST /api/directions (create direction - called by Claude Code)
 */

import { directionDb } from '@/app/db';
import { isValidDirectionStatus } from '@/lib/stateMachine';
import { parseProjectIds } from '@/lib/api-helpers/projectFilter';
import { signalCollector } from '@/lib/brain/signalCollector';
import { createListHandlers } from '@/lib/api-helpers/crudRouteFactory';
import type { DbDirection } from '@/app/db/models/types';

const { GET, POST } = createListHandlers<DbDirection>({
  entityName: 'direction',
  endpoint: '/api/directions',
  statusValues: ['pending', 'processing', 'accepted', 'rejected'],
  validateStatus: isValidDirectionStatus,
  idPrefix: 'direction',

  repo: {
    getById: (id) => directionDb.getDirectionById(id),
    create: (data) => directionDb.createDirection(data as Parameters<typeof directionDb.createDirection>[0]),
  },

  fetchItems: (_projectId, { status, contextMapId, searchParams }) => {
    const projectFilter = parseProjectIds(searchParams);
    const projectIds = projectFilter.mode === 'single'
      ? [projectFilter.projectId!]
      : projectFilter.projectIds || [_projectId];

    const contextId = searchParams.get('contextId');
    const contextGroupId = searchParams.get('contextGroupId');

    if (contextId) return directionDb.getDirectionsByContextIdMultiple(projectIds, contextId);
    if (contextGroupId) return directionDb.getDirectionsByContextGroupIdMultiple(projectIds, contextGroupId);
    if (contextMapId) return directionDb.getDirectionsByContextMapIdMultiple(projectIds, contextMapId);
    if (status === 'pending') return directionDb.getPendingDirectionsMultiple(projectIds);
    if (status === 'accepted') return directionDb.getAcceptedDirectionsMultiple(projectIds);
    if (status === 'rejected') return directionDb.getRejectedDirectionsMultiple(projectIds);
    return directionDb.getDirectionsByProjects(projectIds);
  },

  fetchCounts: (_projectId, _items, { searchParams }) => {
    const projectFilter = parseProjectIds(searchParams);
    const projectIds = projectFilter.mode === 'single'
      ? [projectFilter.projectId!]
      : projectFilter.projectIds || [_projectId];
    return directionDb.getDirectionCountsMultiple(projectIds);
  },

  validateCreate: (body) => {
    const { project_id, context_map_id, context_map_title, direction, summary } = body as Record<string, unknown>;
    if (!project_id || !context_map_id || !context_map_title || !direction || !summary) {
      return 'project_id, context_map_id, context_map_title, direction, and summary are required';
    }
    if (body.pair_label && !['A', 'B'].includes(body.pair_label as string)) {
      return 'pair_label must be "A" or "B"';
    }
    return null;
  },

  buildCreatePayload: (id, body) => ({
    id,
    project_id: body.project_id,
    context_map_id: body.context_map_id,
    context_map_title: body.context_map_title,
    direction: body.direction,
    summary: body.summary,
    status: body.status || 'pending',
    requirement_id: body.requirement_id || null,
    requirement_path: body.requirement_path || null,
    context_id: body.context_id || null,
    context_name: body.context_name || null,
    context_group_id: body.context_group_id || null,
    pair_id: body.pair_id || null,
    pair_label: body.pair_label || null,
    problem_statement: body.problem_statement || null,
    effort: typeof body.effort === 'number' ? Math.max(1, Math.min(10, body.effort as number)) : null,
    impact: typeof body.impact === 'number' ? Math.max(1, Math.min(10, body.impact as number)) : null,
    hypothesis_assertions: typeof body.hypothesis_assertions === 'string'
      ? body.hypothesis_assertions
      : Array.isArray(body.hypothesis_assertions)
        ? JSON.stringify(body.hypothesis_assertions)
        : null,
  }),

  afterCreate: (_created, body) => {
    signalCollector.recordApiFocus(
      body.project_id as string,
      {
        endpoint: '/api/directions',
        method: 'POST',
        callCount: 1,
        avgResponseTime: 0,
        errorRate: 0,
      },
      (body.context_id as string) || undefined,
      (body.context_name as string) || (body.context_map_title as string)
    );
  },
});

export { GET, POST };
