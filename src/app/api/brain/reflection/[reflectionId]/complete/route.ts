/**
 * API Route: Complete Brain Reflection
 *
 * POST /api/brain/reflection/[reflectionId]/complete
 * Called by Claude Code when reflection is complete with insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { completeReflection } from '@/lib/brain/brainService';

async function handlePost(
  request: NextRequest,
  { params }: { params: Promise<{ reflectionId: string }> }
) {
  try {
    const { reflectionId } = await params;
    const body = await request.json();

    const {
      directionsAnalyzed,
      outcomesAnalyzed,
      signalsAnalyzed,
      insights,
      guideSectionsUpdated,
    } = body;

    // Validate required fields
    if (
      typeof directionsAnalyzed !== 'number' ||
      typeof outcomesAnalyzed !== 'number' ||
      typeof signalsAnalyzed !== 'number'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'directionsAnalyzed, outcomesAnalyzed, and signalsAnalyzed are required numbers',
        },
        { status: 400 }
      );
    }

    const result = completeReflection({
      reflectionId,
      directionsAnalyzed,
      outcomesAnalyzed,
      signalsAnalyzed,
      insights: Array.isArray(insights) ? insights : [],
      guideSectionsUpdated,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reflection completed successfully',
      reflection: result.reflection,
      summary: result.summary,
      autoPrune: result.autoPrune,
    });
  } catch (error) {
    console.error('[API] Brain reflection complete error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/brain/reflection/[reflectionId]/complete');
