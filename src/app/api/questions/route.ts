/**
 * API Route: Questions
 *
 * GET /api/questions?projectId=xxx
 * POST /api/questions (create question - called by Claude Code)
 */

import { NextRequest, NextResponse } from 'next/server';
import { questionDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // 'pending', 'answered', or null for all
    const contextMapId = searchParams.get('contextMapId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    let questions;

    if (contextMapId) {
      questions = questionDb.getQuestionsByContextMapId(projectId, contextMapId);
    } else if (status === 'pending') {
      questions = questionDb.getPendingQuestions(projectId);
    } else if (status === 'answered') {
      questions = questionDb.getAnsweredQuestions(projectId);
    } else {
      questions = questionDb.getQuestionsByProject(projectId);
    }

    // Group questions by context_map_id for UI display
    const grouped: Record<string, {
      contextMapId: string;
      contextMapTitle: string;
      questions: typeof questions;
    }> = {};

    for (const q of questions) {
      if (!grouped[q.context_map_id]) {
        grouped[q.context_map_id] = {
          contextMapId: q.context_map_id,
          contextMapTitle: q.context_map_title,
          questions: []
        };
      }
      grouped[q.context_map_id].questions.push(q);
    }

    const counts = questionDb.getQuestionCounts(projectId);

    return NextResponse.json({
      success: true,
      questions,
      grouped: Object.values(grouped),
      counts
    });

  } catch (error) {
    logger.error('[API] Questions GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      project_id,
      context_map_id,
      context_map_title,
      question
    } = body;

    // Validate required fields
    if (!project_id || !context_map_id || !context_map_title || !question) {
      return NextResponse.json(
        { error: 'project_id, context_map_id, context_map_title, and question are required' },
        { status: 400 }
      );
    }

    // Create the question
    const id = body.id || `question_${uuidv4()}`;

    const createdQuestion = questionDb.createQuestion({
      id,
      project_id,
      context_map_id,
      context_map_title,
      question,
      answer: body.answer || null,
      status: body.status || 'pending',
      goal_id: body.goal_id || null
    });

    logger.info('[API] Question created:', { id: createdQuestion.id, context_map_id });

    return NextResponse.json({
      success: true,
      question: createdQuestion
    });

  } catch (error) {
    logger.error('[API] Questions POST error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/questions');
export const POST = withObservability(handlePost, '/api/questions');
