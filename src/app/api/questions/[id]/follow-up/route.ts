/**
 * API Route: Generate Follow-up Questions
 *
 * POST /api/questions/[id]/follow-up
 * Given an answered parent question, generates follow-up questions that drill
 * deeper into the chosen direction. Part of the strategic question tree system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { questionDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: parentId } = await params;
    const body = await request.json();
    const { count = 3 } = body;

    // Validate parent exists and is answered
    const parent = questionDb.getQuestionById(parentId);
    if (!parent) {
      return NextResponse.json(
        { error: 'Parent question not found' },
        { status: 404 }
      );
    }

    if (parent.status !== 'answered' || !parent.answer) {
      return NextResponse.json(
        { error: 'Parent question must be answered before generating follow-ups' },
        { status: 400 }
      );
    }

    // Get the full ancestry chain for context
    const chain = questionDb.getAncestryChain(parentId);
    const newDepth = (parent.tree_depth ?? 0) + 1;

    // Build the strategic context from the chain
    const strategicContext = chain
      .filter(q => q.status === 'answered' && q.answer)
      .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`)
      .join('\n\n');

    // Check if follow-up children already exist
    const existingChildren = questionDb.getChildQuestions(parentId);
    if (existingChildren.length > 0) {
      return NextResponse.json({
        success: true,
        questions: existingChildren,
        message: 'Follow-up questions already exist for this parent',
        alreadyGenerated: true,
      });
    }

    // Generate follow-up questions using the LLM
    const { llmManager } = await import('@/lib/llm');
    const prompt = buildFollowUpPrompt(parent, strategicContext, count);

    const result = await llmManager.generate({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      prompt,
      maxTokens: 2048,
      temperature: 0.7,
      taskType: 'follow-up-questions',
    });

    const responseText = typeof result.response === 'string' ? result.response : '';

    // Parse the generated questions
    const generatedQuestions = parseFollowUpQuestions(responseText, count);

    if (generatedQuestions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate follow-up questions' },
        { status: 500 }
      );
    }

    // Create follow-up questions in DB
    const createdQuestions = generatedQuestions.map(questionText => {
      return questionDb.createQuestion({
        id: `question_${uuidv4()}`,
        project_id: parent.project_id,
        context_map_id: parent.context_map_id,
        context_map_title: parent.context_map_title,
        question: questionText,
        parent_id: parentId,
        tree_depth: newDepth,
      });
    });

    logger.info('[API] Follow-up questions generated:', {
      parentId,
      count: createdQuestions.length,
      depth: newDepth,
    });

    return NextResponse.json({
      success: true,
      questions: createdQuestions,
      parentId,
      depth: newDepth,
      strategicContext,
    });
  } catch (error) {
    logger.error('[API] Follow-up questions error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function buildFollowUpPrompt(
  parent: { question: string; answer: string | null; context_map_title: string },
  strategicContext: string,
  count: number
): string {
  return `You are a strategic product advisor helping drill deeper into a development decision.

## Context Area: ${parent.context_map_title}

## Decision Chain So Far:
${strategicContext}

## Task:
The user just answered the latest question. Based on their answer, generate ${count} follow-up questions that:
1. Drill deeper into the specific direction they chose
2. Explore trade-offs and implementation details of their choice
3. Help narrow the solution space further
4. Are specific and actionable (not generic)

Each follow-up question should reference or build upon the user's answer.

## Format:
Return ONLY the questions, one per line, prefixed with "Q: ". No other text.

Example:
Q: Should the real-time sync use CRDTs for conflict-free merging or an operational transform approach?
Q: What's the acceptable latency threshold for collaborative updates — under 100ms or under 500ms?
Q: Should offline edits be supported, requiring a sync queue, or is always-online acceptable?`;
}

function parseFollowUpQuestions(text: string, maxCount: number): string[] {
  const lines = text.split('\n').filter(l => l.trim());
  const questions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match "Q: ...", "Q1: ...", "- Q: ...", etc.
    const match = trimmed.match(/^(?:[-*]?\s*)?(?:Q\d*[:.]\s*)?(.+\?)\s*$/i);
    if (match && match[1]) {
      questions.push(match[1].trim());
      if (questions.length >= maxCount) break;
    } else if (trimmed.endsWith('?')) {
      // Fallback: any line ending with ? is a question
      questions.push(trimmed.replace(/^[-*]\s*/, ''));
      if (questions.length >= maxCount) break;
    }
  }

  return questions;
}
