/**
 * @route /api/ideas/backlog
 * GET - Ranked idea backlog for a project (headless triage surface).
 *
 * Returns ideas sorted by effort/impact/risk so a CLI can pull a prioritized
 * backlog without client-side sorting. Defaults to pending items ranked by a
 * value heuristic (high impact, low effort first).
 *
 * Query params:
 *   projectId (required)
 *   status     pending|accepted|rejected|implemented (default: pending)
 *   sortBy     value|effort|impact|risk (default: value)
 *   order      asc|desc (default depends on sortBy)
 *   limit      1-200 (default: 50)
 */
import { NextRequest, NextResponse } from 'next/server';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { withObservability } from '@/lib/observability/middleware';
import { isValidIdeaStatus } from '@/app/features/Ideas/lib/ideasHandlers';
import type { DbIdea } from '@/app/db/models/types';

type SortKey = 'value' | 'effort' | 'impact' | 'risk';

function scoreFor(idea: DbIdea, key: SortKey): number {
  const effort = idea.effort ?? 5;
  const impact = idea.impact ?? 5;
  const risk = idea.risk ?? 5;
  switch (key) {
    case 'effort': return effort;
    case 'impact': return impact;
    case 'risk': return risk;
    case 'value':
    default:
      // Higher is better: reward impact, penalize effort + risk.
      return impact * 2 - effort - risk;
  }
}

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const status = searchParams.get('status') || 'pending';
    if (status !== 'all' && !isValidIdeaStatus(status)) {
      return NextResponse.json({ error: `Invalid status value: ${status}` }, { status: 400 });
    }

    const sortBy = (searchParams.get('sortBy') || 'value') as SortKey;
    if (!['value', 'effort', 'impact', 'risk'].includes(sortBy)) {
      return NextResponse.json({ error: `Invalid sortBy value: ${sortBy}` }, { status: 400 });
    }

    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 200) : 50;

    // Default order: value/impact descending (best first), effort/risk ascending (cheapest/safest first).
    const defaultDesc = sortBy === 'value' || sortBy === 'impact';
    const orderParam = searchParams.get('order');
    const desc = orderParam ? orderParam === 'desc' : defaultDesc;

    let ideas = ideaRepository.getIdeasByProject(projectId);
    if (status !== 'all') {
      ideas = ideas.filter((i) => i.status === status);
    }

    ideas.sort((a, b) => {
      const diff = scoreFor(a, sortBy) - scoreFor(b, sortBy);
      return desc ? -diff : diff;
    });

    const ranked = ideas.slice(0, limit).map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      category: i.category,
      scan_type: i.scan_type,
      status: i.status,
      context_id: i.context_id,
      effort: i.effort,
      impact: i.impact,
      risk: i.risk,
      score: scoreFor(i, sortBy),
    }));

    return NextResponse.json({
      success: true,
      projectId,
      status,
      sortBy,
      order: desc ? 'desc' : 'asc',
      total: ideas.length,
      returned: ranked.length,
      ideas: ranked,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/ideas/backlog');
