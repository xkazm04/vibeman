/**
 * API Route: Context Graph
 *
 * GET /api/contexts/graph?projectId=X
 * Returns the full architectural context graph for a project.
 * Used by the AI orchestrator and can be consumed by the frontend
 * for visualization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiOrchestrator } from '@/lib/ai/aiOrchestrator';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 }
    );
  }

  try {
    const graph = aiOrchestrator.getContextGraph(projectId);

    return NextResponse.json({
      success: true,
      graph,
    });
  } catch (error) {
    console.error('[API] Failed to assemble context graph:', error);
    return NextResponse.json(
      { error: 'Failed to assemble context graph' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/contexts/graph');
