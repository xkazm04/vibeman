/**
 * API Route: Direction by ID
 *
 * GET /api/directions/[id] - Get single direction
 * PUT /api/directions/[id] - Update direction (reject or edit content fields)
 * DELETE /api/directions/[id] - Delete direction
 */

import { NextResponse } from 'next/server';
import { directionDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { emitDirectionChanged } from '@/lib/events/domainEmitters';
import { createEntityHandlers } from '@/lib/api-helpers/crudRouteFactory';
import type { DbDirection } from '@/app/db/models/types';

const { GET, PUT, DELETE } = createEntityHandlers<DbDirection>({
  entityName: 'direction',
  endpoint: '/api/directions/[id]',

  repo: {
    getById: (id) => directionDb.getDirectionById(id),
    update: (id, data) => directionDb.updateDirection(id, data as Parameters<typeof directionDb.updateDirection>[1]),
    delete: (id) => directionDb.deleteDirection(id),
  },

  buildUpdatePayload: (body) => ({
    direction: body.direction,
    summary: body.summary,
    context_map_title: body.context_map_title,
    effort: typeof body.effort === 'number' ? Math.max(1, Math.min(10, body.effort as number)) : undefined,
    impact: typeof body.impact === 'number' ? Math.max(1, Math.min(10, body.impact as number)) : undefined,
  }),

  customPut: async (id, body, existing) => {
    const { status } = body as { status?: string };

    // Block status changes that must go through dedicated endpoints
    if (status && status !== 'rejected') {
      return NextResponse.json(
        { error: `Cannot set status to '${status}' via PUT. Use the dedicated accept endpoint for acceptance.` },
        { status: 400 }
      );
    }

    // Handle rejection via dedicated method
    if (status === 'rejected') {
      const rejectedDirection = directionDb.rejectDirection(id);
      if (!rejectedDirection) {
        return NextResponse.json(
          { error: 'Failed to reject direction' },
          { status: 500 }
        );
      }

      logger.info('[API] Direction rejected:', { id });

      emitDirectionChanged({
        projectId: existing.project_id,
        directionId: id,
        action: 'rejected',
        contextId: existing.context_id || id,
        contextName: existing.context_name || existing.context_map_title,
      });

      return NextResponse.json({ success: true, direction: rejectedDirection });
    }

    // Return null to fall through to default update logic
    return null;
  },

  afterDelete: (entity) => {
    emitDirectionChanged({
      projectId: entity.project_id,
      directionId: entity.id,
      action: 'deleted',
      contextId: entity.context_id,
      contextName: entity.context_name || entity.context_map_title,
    });
  },
});

export { GET, PUT, DELETE };
