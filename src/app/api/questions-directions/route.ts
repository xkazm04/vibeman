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

    // Group questions by context_map_id
    const questionGrouped: Record<string, {
      contextMapId: string;
      contextMapTitle: string;
      questions: typeof questions;
    }> = {};

    for (const q of questions) {
      if (!questionGrouped[q.context_map_id]) {
        questionGrouped[q.context_map_id] = {
          contextMapId: q.context_map_id,
          contextMapTitle: q.context_map_title,
          questions: [],
        };
      }
      questionGrouped[q.context_map_id].questions.push(q);
    }

    // Group directions by context_map_id
    const directionGrouped: Record<string, {
      contextMapId: string;
      contextMapTitle: string;
      directions: typeof directions;
    }> = {};

    for (const d of directions) {
      if (!directionGrouped[d.context_map_id]) {
        directionGrouped[d.context_map_id] = {
          contextMapId: d.context_map_id,
          contextMapTitle: d.context_map_title,
          directions: [],
        };
      }
      directionGrouped[d.context_map_id].directions.push(d);
    }

    return NextResponse.json({
      success: true,
      questions: {
        questions,
        grouped: Object.values(questionGrouped),
        counts: questionCounts,
        maxTreeDepth,
      },
      directions: {
        directions,
        grouped: Object.values(directionGrouped),
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
