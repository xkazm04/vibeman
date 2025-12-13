/**
 * Onboarding Accelerator API - Quiz System
 * Quiz questions and response handling
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  quizQuestionDb,
  quizResponseDb,
  learningMetricsDb,
  learningModuleDb,
} from '@/app/db';
import type { QuizAnswerStatus } from '@/app/db/models/onboarding-accelerator.types';

import { logger } from '@/lib/logger';
/**
 * GET /api/onboarding-accelerator/quiz
 * Get quiz questions and responses
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const pathId = searchParams.get('pathId');
    const questionId = searchParams.get('questionId');

    // Get single question by ID
    if (questionId) {
      const question = quizQuestionDb.getById(questionId);
      if (!question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      }

      // Get responses if pathId provided
      let responses: ReturnType<typeof quizResponseDb.getByQuestion> = [];
      if (pathId) {
        responses = quizResponseDb.getByQuestion(questionId, pathId);
      }

      return NextResponse.json({
        ...question,
        options: JSON.parse(question.options),
        responses,
      });
    }

    // Get questions by module
    if (moduleId) {
      const questions = quizQuestionDb.getByModule(moduleId);
      return NextResponse.json(
        questions.map(q => ({
          ...q,
          options: JSON.parse(q.options),
        }))
      );
    }

    // Get quiz stats by path
    if (pathId) {
      const stats = quizResponseDb.getStats(pathId);
      const responses = quizResponseDb.getByPath(pathId);
      return NextResponse.json({ stats, responses });
    }

    return NextResponse.json({ error: 'moduleId or pathId is required' }, { status: 400 });
  } catch (error) {
    logger.error('Error fetching quiz data:', { data: error });
    return NextResponse.json({ error: 'Failed to fetch quiz data' }, { status: 500 });
  }
}

/**
 * POST /api/onboarding-accelerator/quiz
 * Create quiz question or submit response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Submit quiz response
    if (action === 'submit') {
      const { questionId, pathId, answer, timeTakenSeconds } = body;

      if (!questionId || !pathId || !answer) {
        return NextResponse.json(
          { error: 'questionId, pathId, and answer are required' },
          { status: 400 }
        );
      }

      // Get the question to validate answer
      const question = quizQuestionDb.getById(questionId);
      if (!question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      }

      // Determine if answer is correct
      let status: QuizAnswerStatus = 'incorrect';
      let pointsEarned = 0;

      const correctAnswer = question.correct_answer.toLowerCase().trim();
      const userAnswer = answer.toLowerCase().trim();

      if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
        if (userAnswer === correctAnswer) {
          status = 'correct';
          pointsEarned = question.points;
        }
      } else if (question.question_type === 'fill_blank') {
        // Allow partial matching for fill-in-blank
        if (userAnswer === correctAnswer) {
          status = 'correct';
          pointsEarned = question.points;
        } else if (correctAnswer.includes(userAnswer) || userAnswer.includes(correctAnswer)) {
          status = 'partial';
          pointsEarned = Math.floor(question.points / 2);
        }
      } else if (question.question_type === 'code_review') {
        // Code review is subjective - for now, check keyword presence
        const keywords = correctAnswer.split(',').map(k => k.trim());
        const matchedKeywords = keywords.filter(k => userAnswer.includes(k));
        const matchRatio = matchedKeywords.length / keywords.length;

        if (matchRatio >= 0.8) {
          status = 'correct';
          pointsEarned = question.points;
        } else if (matchRatio >= 0.4) {
          status = 'partial';
          pointsEarned = Math.floor(question.points * matchRatio);
        }
      }

      // Generate feedback
      let feedback = '';
      if (status === 'correct') {
        feedback = 'Correct! ' + question.explanation;
      } else if (status === 'partial') {
        feedback = 'Partially correct. ' + question.explanation;
      } else {
        feedback = 'Not quite. The correct answer is: ' + question.correct_answer + '. ' + question.explanation;
      }

      // Save response
      const response = quizResponseDb.create({
        question_id: questionId,
        path_id: pathId,
        answer,
        status,
        points_earned: pointsEarned,
        time_taken_seconds: timeTakenSeconds || 0,
        feedback,
      });

      // Update metrics
      const module = learningModuleDb.getById(question.module_id);
      if (module) {
        learningMetricsDb.recordQuizAttempt(
          pathId,
          module.id,
          status === 'correct',
          pointsEarned
        );
      }

      return NextResponse.json({
        ...response,
        isCorrect: status === 'correct',
        correctAnswer: question.correct_answer,
      }, { status: 201 });
    }

    // Create new question
    const {
      moduleId,
      question,
      questionType,
      options,
      correctAnswer,
      explanation,
      codeSnippet,
      difficulty,
      points,
      orderIndex,
    } = body;

    if (!moduleId || !question || !questionType || !correctAnswer || !explanation || orderIndex === undefined) {
      return NextResponse.json(
        { error: 'moduleId, question, questionType, correctAnswer, explanation, and orderIndex are required' },
        { status: 400 }
      );
    }

    const newQuestion = quizQuestionDb.create({
      module_id: moduleId,
      question,
      question_type: questionType,
      options,
      correct_answer: correctAnswer,
      explanation,
      code_snippet: codeSnippet,
      difficulty,
      points,
      order_index: orderIndex,
    });

    return NextResponse.json({
      ...newQuestion,
      options: JSON.parse(newQuestion.options),
    }, { status: 201 });
  } catch (error) {
    logger.error('Error in quiz operation:', { data: error });
    return NextResponse.json({ error: 'Failed to process quiz operation' }, { status: 500 });
  }
}

/**
 * DELETE /api/onboarding-accelerator/quiz
 * Delete a quiz question
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json({ error: 'questionId is required' }, { status: 400 });
    }

    quizQuestionDb.delete(questionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting question:', { data: error });
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
