/**
 * POST /api/directions/pair/[pairId]/accept
 * Accept one variant from a direction pair.
 * Delegates to acceptDirectionPair workflow for all business logic.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { acceptDirectionPair } from '@/lib/ideas/directionPairAcceptanceWorkflow';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const { pairId } = await params;
    const body = await request.json();
    const { variant, projectPath } = body;

    if (!variant || !['A', 'B'].includes(variant)) {
      return NextResponse.json(
        { error: 'variant must be "A" or "B"' },
        { status: 400 }
      );
    }

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    const outcome = acceptDirectionPair({ pairId, variant: variant as 'A' | 'B', projectPath });

    if (!outcome.success) {
      if (outcome.code === 'NOT_FOUND') {
        return NextResponse.json({ error: outcome.message }, { status: 404 });
      }
      if (outcome.code === 'ALREADY_PROCESSED') {
        return NextResponse.json({ error: outcome.message }, { status: 409 });
      }
      logger.error('[API] Direction pair accept failed:', { pairId, code: outcome.code, message: outcome.message });
      return NextResponse.json({ error: outcome.message }, { status: 500 });
    }

    logger.info('[API] Direction pair variant accepted:', {
      pairId,
      acceptedVariant: variant,
      requirementName: outcome.requirementName,
    });

    return NextResponse.json({
      success: true,
      accepted: outcome.accepted,
      rejected: outcome.rejected,
      requirementName: outcome.requirementName,
      requirementPath: outcome.requirementPath,
    });
  } catch (error) {
    logger.error('[API] Direction pair accept error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
