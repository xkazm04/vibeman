import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';

/**
 * GET /api/ideas/effort-impact
 * Get effort vs impact analysis for ideas
 * Query params:
 * - projectId: Filter by project
 * - contextId: Filter by context
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const contextId = searchParams.get('contextId');

    // Get ideas based on filters
    let ideas = ideaDb.getAllIdeas();

    if (projectId) {
      ideas = ideas.filter(idea => idea.project_id === projectId);
    }

    if (contextId) {
      ideas = ideas.filter(idea => idea.context_id === contextId);
    }

    // Filter ideas that have both effort and impact values
    const scoredIdeas = ideas.filter(idea =>
      idea.effort !== null &&
      idea.impact !== null
    );

    // Categorize into quadrants
    const quickWins = scoredIdeas.filter(i =>
      i.effort! <= 2 && i.impact! >= 2
    );

    const majorProjects = scoredIdeas.filter(i =>
      i.effort! === 3 && i.impact! >= 2
    );

    const fillIns = scoredIdeas.filter(i =>
      i.effort! <= 2 && i.impact! === 1
    );

    const thankless = scoredIdeas.filter(i =>
      i.effort! === 3 && i.impact! === 1
    );

    // Calculate acceptance rates for each quadrant
    const calcAcceptance = (items: typeof scoredIdeas) => {
      if (items.length === 0) return 0;
      const accepted = items.filter(i =>
        i.status === 'accepted' || i.status === 'implemented'
      ).length;
      return Math.round((accepted / items.length) * 100);
    };

    // Calculate insights by effort and impact levels
    const byEffort = {
      low: scoredIdeas.filter(i => i.effort === 1),
      medium: scoredIdeas.filter(i => i.effort === 2),
      high: scoredIdeas.filter(i => i.effort === 3)
    };

    const byImpact = {
      low: scoredIdeas.filter(i => i.impact === 1),
      medium: scoredIdeas.filter(i => i.impact === 2),
      high: scoredIdeas.filter(i => i.impact === 3)
    };

    // Map ideas for scatter plot
    const scatterData = scoredIdeas.map(idea => ({
      id: idea.id,
      title: idea.title,
      effort: idea.effort!,
      impact: idea.impact!,
      status: idea.status,
      scanType: idea.scan_type
    }));

    return NextResponse.json({
      quadrants: {
        quickWins: {
          count: quickWins.length,
          acceptanceRate: calcAcceptance(quickWins),
          ideas: quickWins.map(i => ({ id: i.id, title: i.title, status: i.status }))
        },
        majorProjects: {
          count: majorProjects.length,
          acceptanceRate: calcAcceptance(majorProjects),
          ideas: majorProjects.map(i => ({ id: i.id, title: i.title, status: i.status }))
        },
        fillIns: {
          count: fillIns.length,
          acceptanceRate: calcAcceptance(fillIns),
          ideas: fillIns.map(i => ({ id: i.id, title: i.title, status: i.status }))
        },
        thankless: {
          count: thankless.length,
          acceptanceRate: calcAcceptance(thankless),
          ideas: thankless.map(i => ({ id: i.id, title: i.title, status: i.status }))
        }
      },
      insights: {
        byEffort: {
          low: { count: byEffort.low.length, acceptanceRate: calcAcceptance(byEffort.low) },
          medium: { count: byEffort.medium.length, acceptanceRate: calcAcceptance(byEffort.medium) },
          high: { count: byEffort.high.length, acceptanceRate: calcAcceptance(byEffort.high) }
        },
        byImpact: {
          low: { count: byImpact.low.length, acceptanceRate: calcAcceptance(byImpact.low) },
          medium: { count: byImpact.medium.length, acceptanceRate: calcAcceptance(byImpact.medium) },
          high: { count: byImpact.high.length, acceptanceRate: calcAcceptance(byImpact.high) }
        }
      },
      scatterData,
      total: scoredIdeas.length,
      totalIdeas: ideas.length
    });
  } catch (error) {
    console.error('Error fetching effort-impact stats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch effort-impact stats' },
      { status: 500 }
    );
  }
}
