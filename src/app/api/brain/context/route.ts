/**
 * Brain Context API
 * Returns computed behavioral context for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { getBehavioralContext } from '@/lib/brain/behavioralContext';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const windowDays = parseInt(searchParams.get('windowDays') || '7', 10);

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const context = getBehavioralContext(projectId, windowDays);

    return NextResponse.json({
      success: true,
      context,
    });
  } catch (error) {
    console.error('Failed to get behavioral context:', error);
    return NextResponse.json(
      { error: 'Failed to get behavioral context' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGET, '/api/brain/context');
