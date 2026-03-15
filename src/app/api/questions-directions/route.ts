/**
 * Combined Questions & Directions API
 *
 * GET /api/questions-directions?projectId=xxx
 *
 * Returns both questions and directions in a single response,
 * eliminating 2 HTTP roundtrips on QuestionsLayout mount.
 */

import { NextRequest, NextResponse } from 'next/server';
import { questionDb, directionDb } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';
import { groupByContextMap } from '@/lib/api-helpers/groupByContextMap';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch questions and directions in sequence (same DB, near-zero overhead)
    const questions = questionDb.getQuestionsByProject(projectId);

    // Derive counts and max depth from the already-fetched array (saves 2 DB roundtrips)
    let pending = 0, answered = 0, maxTreeDepth = 0;
    for (const q of questions) {
      if (q.status === 'pending') pending++;
      else if (q.status === 'answered') answered++;
      if ((q.tree_depth ?? 0) > maxTreeDepth) maxTreeDepth = q.tree_depth ?? 0;
    }
    const questionCounts = { total: questions.length, pending, answered };

    const directions = directionDb.getDirectionsByProjects([projectId]);
    const directionCounts = directionDb.getDirectionCountsMultiple([projectId]);

    return NextResponse.json({
      success: true,
      questions: {
        items: questions,
        grouped: groupByContextMap(questions),
        counts: questionCounts,
        maxTreeDepth,
      },
      directions: {
        items: directions,
        grouped: groupByContextMap(directions),
        counts: directionCounts,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/questions-directions');
