/**
 * API Route: Question by ID
 *
 * GET /api/questions/[id] - Get single question
 * PUT /api/questions/[id] - Update question (answer it)
 * DELETE /api/questions/[id] - Delete question
 */

import { NextRequest, NextResponse } from 'next/server';
import { questionDb } from '@/app/db';
import { logger } from '@/lib/logger';

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

    // Update the question (no longer auto-creates goals)
    const updatedQuestion = questionDb.updateQuestion(id, {
      answer: answer ?? body.answer,
      status: answer ? 'answered' : body.status,
      question: body.question,
      context_map_title: body.context_map_title
    });

    if (!updatedQuestion) {
      return NextResponse.json(
        { error: 'Failed to update question' },
        { status: 500 }
      );
    }

    logger.info('[API] Question updated:', { questionId: id, hasAnswer: !!answer });

    return NextResponse.json({
      success: true,
      question: updatedQuestion
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
