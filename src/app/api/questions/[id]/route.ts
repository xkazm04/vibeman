/**
 * API Route: Question by ID
 *
 * GET /api/questions/[id] - Get single question
 * PUT /api/questions/[id] - Update question (answer it)
 * DELETE /api/questions/[id] - Delete question
 */

import { NextRequest, NextResponse } from 'next/server';
import { questionDb, goalDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const question = questionDb.getQuestionById(id);

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      question
    });

  } catch (error) {
    logger.error('[API] Question GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get existing question
    const existingQuestion = questionDb.getQuestionById(id);
    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const { answer } = body;

    // If answer is provided and question wasn't already answered, auto-create a Goal
    let createdGoal = null;
    let goalId = existingQuestion.goal_id;

    if (answer && existingQuestion.status !== 'answered' && !existingQuestion.goal_id) {
      // Get max order_index for goals in this project
      const maxOrderIndex = goalDb.getMaxOrderIndex(existingQuestion.project_id);

      // Create goal from the answered question
      const goalTitle = existingQuestion.question.length > 100
        ? existingQuestion.question.substring(0, 97) + '...'
        : existingQuestion.question;

      createdGoal = goalDb.createGoal({
        id: `goal_${uuidv4()}`,
        project_id: existingQuestion.project_id,
        title: goalTitle,
        description: answer,
        status: 'open',
        order_index: maxOrderIndex + 1
      });

      goalId = createdGoal.id;
      logger.info('[API] Auto-created goal from answered question:', {
        questionId: id,
        goalId: createdGoal.id
      });
    }

    // Update the question
    const updatedQuestion = questionDb.updateQuestion(id, {
      answer: answer ?? body.answer,
      status: answer ? 'answered' : body.status,
      goal_id: goalId,
      question: body.question,
      context_map_title: body.context_map_title
    });

    if (!updatedQuestion) {
      return NextResponse.json(
        { error: 'Failed to update question' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
      goal: createdGoal,
      goalCreated: !!createdGoal
    });

  } catch (error) {
    logger.error('[API] Question PUT error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deleted = questionDb.deleteQuestion(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    logger.info('[API] Question deleted:', { id });

    return NextResponse.json({
      success: true,
      deleted: true
    });

  } catch (error) {
    logger.error('[API] Question DELETE error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
