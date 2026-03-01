/**
 * API Route: Auto-Deepen Question via Gap Detection
 *
 * POST /api/questions/[id]/auto-deepen
 * Analyzes an answered question for hedging/ambiguity gaps, then auto-generates
 * targeted follow-up questions that address the specific detected gaps.
 * This transforms the question tree from a static model into a strategic
 * interview that drills down until it reaches actionable clarity.
 */

import { NextRequest, NextResponse } from 'next/server';
import { questionDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { analyzeAnswerGaps, buildGapTargetingPrompt, type GapAnalysis } from '@/lib/questions/gapDetector';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;

    // Validate question exists and is answered
    const question = questionDb.getQuestionById(questionId);
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    if (question.status !== 'answered' || !question.answer) {
      return NextResponse.json(
        { error: 'Question must be answered before auto-deepening' },
        { status: 400 }
      );
    }

    // Run gap analysis on the answer
    const analysis = analyzeAnswerGaps(questionId, question.answer);

    // Save gap analysis on the question
    questionDb.updateQuestion(questionId, {
      gap_score: analysis.gapScore,
      gap_analysis: JSON.stringify(analysis.gaps),
    });

    // If no significant gaps detected, return analysis without generating follow-ups
    if (!analysis.shouldDeepen) {
      logger.info('[API] Auto-deepen: answer is clear, no follow-ups needed', {
        questionId,
        gapScore: analysis.gapScore,
        gapCount: analysis.gaps.length,
      });

      return NextResponse.json({
        success: true,
        deepened: false,
        analysis: {
          gapScore: analysis.gapScore,
          gapCount: analysis.gaps.length,
          summary: analysis.summary,
          gaps: analysis.gaps,
        },
        questions: [],
      });
    }

    // Check if follow-up children already exist
    const existingChildren = questionDb.getChildQuestions(questionId);
    if (existingChildren.length > 0) {
      return NextResponse.json({
        success: true,
        deepened: false,
        analysis: {
          gapScore: analysis.gapScore,
          gapCount: analysis.gaps.length,
          summary: analysis.summary,
          gaps: analysis.gaps,
        },
        questions: existingChildren,
        message: 'Follow-up questions already exist',
        alreadyGenerated: true,
      });
    }

    // Get ancestry chain for context
    const chain = questionDb.getAncestryChain(questionId);
    const newDepth = (question.tree_depth ?? 0) + 1;

    // Build strategic context from the chain
    const strategicContext = chain
      .filter(q => q.status === 'answered' && q.answer)
      .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`)
      .join('\n\n');

    // Generate gap-targeted follow-up questions using LLM
    const { llmManager } = await import('@/lib/llm');
    const gapTargetingPrompt = buildGapTargetingPrompt(analysis);
    const count = Math.min(Math.max(analysis.gaps.length, 2), 3); // 2-3 based on gaps

    const prompt = buildAutoDeepenPrompt(
      question,
      strategicContext,
      gapTargetingPrompt,
      count
    );

    const result = await llmManager.generate({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      prompt,
      maxTokens: 2048,
      temperature: 0.7,
      taskType: 'auto-deepen-questions',
    });

    const responseText = typeof result.response === 'string' ? result.response : '';
    const generatedQuestions = parseFollowUpQuestions(responseText, count);

    if (generatedQuestions.length === 0) {
      logger.warn('[API] Auto-deepen: LLM failed to generate questions', { questionId });
      return NextResponse.json({
        success: true,
        deepened: false,
        analysis: {
          gapScore: analysis.gapScore,
          gapCount: analysis.gaps.length,
          summary: analysis.summary,
          gaps: analysis.gaps,
        },
        questions: [],
        message: 'Gap analysis detected ambiguity but follow-up generation failed',
      });
    }

    // Create follow-up questions in DB, flagged as auto-deepened
    const createdQuestions = generatedQuestions.map(questionText => {
      return questionDb.createQuestion({
        id: `question_${uuidv4()}`,
        project_id: question.project_id,
        context_map_id: question.context_map_id,
        context_map_title: question.context_map_title,
        question: questionText,
        parent_id: questionId,
        tree_depth: newDepth,
        auto_deepened: 1,
      });
    });

    logger.info('[API] Auto-deepen: generated targeted follow-ups', {
      questionId,
      gapScore: analysis.gapScore,
      gapCount: analysis.gaps.length,
      generatedCount: createdQuestions.length,
      depth: newDepth,
    });

    return NextResponse.json({
      success: true,
      deepened: true,
      analysis: {
        gapScore: analysis.gapScore,
        gapCount: analysis.gaps.length,
        summary: analysis.summary,
        gaps: analysis.gaps,
      },
      questions: createdQuestions,
      parentId: questionId,
      depth: newDepth,
    });
  } catch (error) {
    logger.error('[API] Auto-deepen error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function buildAutoDeepenPrompt(
  parent: { question: string; answer: string | null; context_map_title: string },
  strategicContext: string,
  gapTargetingPrompt: string,
  count: number
): string {
  return `You are a strategic product advisor conducting an adaptive interview. Your goal is to eliminate ambiguity from the user's answers by asking precise follow-up questions.

## Context Area: ${parent.context_map_title}

## Decision Chain So Far:
${strategicContext}
${gapTargetingPrompt}

## Task:
Generate exactly ${count} follow-up questions that:
1. Each directly targets a specific gap detected in the user's answer
2. Force a concrete, binary or specific choice (not open-ended)
3. Reference the exact hedging language or conditional the user used
4. Cannot be answered with another vague response

## Format:
Return ONLY the questions, one per line, prefixed with "Q: ". No other text.

Example:
Q: You said "it depends on scale" — at what specific user count does the architecture need to change: 1K, 10K, or 100K concurrent users?
Q: You mentioned both Redis and in-memory caching as options — which one should be the primary cache layer for v1?
Q: You said you'd "figure out auth later" — should we block on auth implementation before shipping, or launch without it?`;
}

function parseFollowUpQuestions(text: string, maxCount: number): string[] {
  const lines = text.split('\n').filter(l => l.trim());
  const questions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(?:[-*]?\s*)?(?:Q\d*[:.]\s*)?(.+\?)\s*$/i);
    if (match && match[1]) {
      questions.push(match[1].trim());
      if (questions.length >= maxCount) break;
    } else if (trimmed.endsWith('?')) {
      questions.push(trimmed.replace(/^[-*]\s*/, ''));
      if (questions.length >= maxCount) break;
    }
  }

  return questions;
}
