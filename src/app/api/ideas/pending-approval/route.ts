/**
 * @route /api/ideas/pending-approval
 * GET - List plan items held by the risk/effort approval gate.
 *
 * Returns ideas from saved plans (scan_type 'plan') that are still 'pending'
 * — i.e. flagged as high effort/risk by /api/plans/save and awaiting an
 * accept/reject decision via /api/ideas/approve.
 *
 * Query params: projectId (required)
 */
import { NextRequest, NextResponse } from 'next/server';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const pending = ideaRepository
      .getIdeasByProject(projectId)
      .filter((i) => i.status === 'pending' && i.scan_type === 'plan')
      .map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        category: i.category,
        context_id: i.context_id,
        effort: i.effort,
        impact: i.impact,
        risk: i.risk,
        created_at: i.created_at,
      }));

    return NextResponse.json({
      success: true,
      projectId,
      count: pending.length,
      ideas: pending,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/ideas/pending-approval');
