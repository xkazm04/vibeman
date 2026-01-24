import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { SCAN_TYPES } from '@/app/features/Ideas/sub_IdeasSetup/lib/ScanTypeConfig';
import { withObservability } from '@/lib/observability/middleware';

interface Idea {
  project_id: string;
  context_id: string | null;
  scan_type: string;
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
}

function filterIdeas(ideas: Idea[], projectId: string | null, contextId: string | null): Idea[] {
  let filtered = ideas;

  if (projectId) {
    filtered = filtered.filter(idea => idea.project_id === projectId);
  }

  if (contextId) {
    filtered = filtered.filter(idea => idea.context_id === contextId);
  }

  return filtered;
}

function calculateStatusCounts(ideas: Idea[]) {
  return {
    pending: ideas.filter(i => i.status === 'pending').length,
    accepted: ideas.filter(i => i.status === 'accepted').length,
    rejected: ideas.filter(i => i.status === 'rejected').length,
    implemented: ideas.filter(i => i.status === 'implemented').length,
    total: ideas.length
  };
}

function calculateAcceptanceRatio(accepted: number, implemented: number, total: number): number {
  return total > 0 ? Math.round(((accepted + implemented) / total) * 100) : 0;
}

function calculateScanTypeStats(ideas: Idea[]) {
  const scanTypes = SCAN_TYPES.map(t => t.value);

  return scanTypes.map(scanType => {
    const scanIdeas = ideas.filter(idea => idea.scan_type === scanType);
    const counts = calculateStatusCounts(scanIdeas);

    return {
      scanType,
      ...counts,
      acceptanceRatio: calculateAcceptanceRatio(counts.accepted, counts.implemented, counts.total)
    };
  });
}

function calculateOverallStats(ideas: Idea[]) {
  const counts = calculateStatusCounts(ideas);

  return {
    ...counts,
    acceptanceRatio: calculateAcceptanceRatio(counts.accepted, counts.implemented, counts.total)
  };
}

function groupByField<T extends string>(
  ideas: Idea[],
  fieldGetter: (idea: Idea) => T | null
) {
  const map = new Map<T, number>();

  ideas.forEach(idea => {
    const fieldValue = fieldGetter(idea);
    if (fieldValue) {
      const count = map.get(fieldValue) || 0;
      map.set(fieldValue, count + 1);
    }
  });

  return map;
}

/**
 * GET /api/ideas/stats
 * Get idea statistics grouped by scan type
 * Query params:
 * - projectId: Filter by project
 * - contextId: Filter by context
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const contextId = searchParams.get('contextId');

    const allIdeas = ideaDb.getAllIdeas();
    const ideas = filterIdeas(allIdeas, projectId, contextId);

    const scanTypeStats = calculateScanTypeStats(ideas);
    const overall = calculateOverallStats(ideas);

    const projectMap = groupByField(ideas, idea => idea.project_id);
    const projects = Array.from(projectMap.entries()).map(([projectId, totalIdeas]) => ({
      projectId,
      name: projectId,
      totalIdeas
    }));

    const contextMap = groupByField(ideas, idea => idea.context_id);
    const contexts = Array.from(contextMap.entries()).map(([contextId, totalIdeas]) => ({
      contextId,
      name: contextId,
      totalIdeas
    }));

    return NextResponse.json({
      scanTypes: scanTypeStats,
      overall,
      projects,
      contexts
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/ideas/stats');
