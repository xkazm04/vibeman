/**
 * API Route: Schema Intelligence Recommendations
 *
 * GET   /api/schema-intelligence/recommendations - List recommendations
 * PATCH /api/schema-intelligence/recommendations - Accept/reject/apply/rollback a recommendation
 */

import { NextRequest, NextResponse } from 'next/server';
import { schemaRecommendationRepository } from '@/app/db/repositories/schema-intelligence.repository';
import { schemaIntelligenceEngine } from '@/lib/db/schemaIntelligenceEngine';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'default';
    const status = searchParams.get('status');

    let recommendations;
    if (status) {
      recommendations = schemaRecommendationRepository.getByStatus(
        status as 'pending' | 'accepted' | 'rejected' | 'applied' | 'rolled_back',
        projectId,
      );
    } else {
      recommendations = schemaRecommendationRepository.getAll(projectId);
    }

    return NextResponse.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get recommendations';
    logger.error('[SchemaIntelligence Recommendations] GET error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, reason, projectId } = body;

    if (!id || !action) {
      return NextResponse.json(
        { success: false, error: 'id and action are required' },
        { status: 400 },
      );
    }

    const validActions = ['accept', 'reject', 'apply', 'rollback'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 },
      );
    }

    const pid = projectId || 'default';

    switch (action) {
      case 'accept':
        schemaIntelligenceEngine.accept(id, reason, pid);
        return NextResponse.json({ success: true, message: 'Recommendation accepted' });

      case 'reject':
        schemaIntelligenceEngine.reject(id, reason, pid);
        return NextResponse.json({ success: true, message: 'Recommendation rejected' });

      case 'apply': {
        const result = schemaIntelligenceEngine.apply(id, pid);
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 },
          );
        }
        return NextResponse.json({ success: true, message: 'Migration applied successfully' });
      }

      case 'rollback': {
        const result = schemaIntelligenceEngine.rollback(id, pid);
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 },
          );
        }
        return NextResponse.json({ success: true, message: 'Migration rolled back successfully' });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update recommendation';
    logger.error('[SchemaIntelligence Recommendations] PATCH error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
