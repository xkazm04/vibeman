/**
 * API Route: Accept Direction
 *
 * POST /api/directions/[id]/accept
 *
 * Accepts a single direction or a pair variant.
 *   - Single: body { projectPath }              — id is a direction ID
 *   - Pair:   body { projectPath, variant }      — id is a pair ID, variant is 'A' | 'B'
 *
 * Delegates to the unified acceptDirection saga.
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionRepository } from '@/app/db/repositories/direction.repository';
import { logger } from '@/lib/logger';
import { createParamsRouteHandler } from '@/lib/api-helpers/createRouteHandler';
import { acceptDirection } from '@/lib/ideas/directionAcceptanceWorkflow';

async function handlePost(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { projectPath, variant } = body;

  if (!projectPath) {
    return NextResponse.json(
      { error: 'projectPath is required' },
      { status: 400 }
    );
  }

  if (variant !== undefined && !['A', 'B'].includes(variant)) {
    return NextResponse.json(
      { error: 'variant must be "A" or "B"' },
      { status: 400 }
    );
  }

  const outcome = variant
    ? acceptDirection({ pairId: id, variant: variant as 'A' | 'B', projectPath })
    : acceptDirection({ directionId: id, projectPath });

  if (!outcome.success) {
    if (outcome.code === 'NOT_FOUND') {
      return NextResponse.json({ error: outcome.message }, { status: 404 });
    }
    if (outcome.code === 'ALREADY_PROCESSED') {
      const direction = directionRepository.getDirectionById(id);
      return NextResponse.json(
        {
          error: outcome.message,
          direction,
          requirementName: outcome.details ?? '',
          requirementPath: direction?.requirement_path ?? '',
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: outcome.message }, { status: 500 });
  }

  logger.info('[API] Direction accepted and requirement created:', {
    directionId: outcome.direction.id,
    requirementId: outcome.requirementName,
    requirementPath: outcome.requirementPath,
    ideaId: outcome.ideaId,
    rejected: outcome.rejected?.id ?? null,
  });

  return NextResponse.json({
    success: true,
    direction: outcome.direction,
    requirementName: outcome.requirementName,
    requirementPath: outcome.requirementPath,
    ideaId: outcome.ideaId,
    ...(outcome.rejected != null && {
      accepted: outcome.direction,
      rejected: outcome.rejected,
    }),
  });
}

export const POST = createParamsRouteHandler(handlePost, {
  endpoint: '/api/directions/[id]/accept',
  method: 'POST',
  middleware: { rateLimit: { tier: 'expensive' } },
});
