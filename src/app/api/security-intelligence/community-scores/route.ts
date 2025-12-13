import { NextRequest, NextResponse } from 'next/server';
import { communitySecurityScoreDb } from '@/app/db';
import type { CommunityScoreApiResponse } from '@/app/db/models/security-intelligence.types';
import { logger } from '@/lib/logger';

/**
 * GET /api/security-intelligence/community-scores
 * Get community security scores
 *
 * This endpoint serves as a public API for community-driven security scoring
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const packageName = searchParams.get('packageName');
    const packageVersion = searchParams.get('packageVersion');

    // Get aggregated score for a package (public API)
    if (packageName) {
      const aggregated = communitySecurityScoreDb.getAggregatedScore(
        packageName,
        packageVersion || undefined
      );

      if (!aggregated) {
        return NextResponse.json({
          success: true,
          packageName,
          packageVersion: packageVersion || 'all',
          aggregatedScore: 50, // Default neutral score
          totalVotes: 0,
          breakdown: { positive: 0, negative: 0, neutral: 0 },
          sources: [],
          lastUpdated: new Date().toISOString(),
        } as CommunityScoreApiResponse);
      }

      return NextResponse.json({
        success: true,
        packageName,
        packageVersion: packageVersion || 'all',
        aggregatedScore: aggregated.aggregatedScore,
        totalVotes: aggregated.totalVotes,
        breakdown: {
          positive: aggregated.breakdown.positive,
          negative: aggregated.breakdown.negative,
          neutral: aggregated.totalVotes - aggregated.breakdown.positive - aggregated.breakdown.negative,
        },
        sources: aggregated.sources,
        lastUpdated: new Date().toISOString(),
      } as CommunityScoreApiResponse);
    }

    // Get project-specific scores
    if (projectId) {
      const scores = communitySecurityScoreDb.getByProjectId(projectId);
      return NextResponse.json({ scores });
    }

    return NextResponse.json(
      { error: 'Either projectId or packageName is required' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Error fetching community scores:', { error });
    return NextResponse.json(
      { error: 'Failed to fetch community scores' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security-intelligence/community-scores
 * Submit a community score/vote for a package
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      packageName,
      packageVersion,
      vote,
      score,
      notes,
      source,
    } = body;

    if (!projectId || !packageName || !packageVersion) {
      return NextResponse.json(
        { error: 'projectId, packageName, and packageVersion are required' },
        { status: 400 }
      );
    }

    // If a vote is provided, submit it
    if (vote) {
      const validVotes = ['positive', 'negative'];
      if (!validVotes.includes(vote)) {
        return NextResponse.json(
          { error: 'vote must be either "positive" or "negative"' },
          { status: 400 }
        );
      }

      communitySecurityScoreDb.submitVote(
        projectId,
        packageName,
        packageVersion,
        vote,
        source || 'internal'
      );

      return NextResponse.json({ success: true, action: 'vote_submitted' });
    }

    // If a direct score is provided, upsert it
    if (typeof score === 'number') {
      if (score < 0 || score > 100) {
        return NextResponse.json(
          { error: 'score must be between 0 and 100' },
          { status: 400 }
        );
      }

      const id = `css_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const scoreRecord = communitySecurityScoreDb.upsert({
        id,
        projectId,
        packageName,
        packageVersion,
        communityScore: score,
        totalVotes: 1,
        positiveVotes: score >= 50 ? 1 : 0,
        negativeVotes: score < 50 ? 1 : 0,
        source: source || 'internal',
        notes: notes || null,
        lastUpdated: new Date(),
      });

      return NextResponse.json({ success: true, score: scoreRecord });
    }

    return NextResponse.json(
      { error: 'Either vote or score is required' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Error submitting community score:', { error });
    return NextResponse.json(
      { error: 'Failed to submit community score' },
      { status: 500 }
    );
  }
}
