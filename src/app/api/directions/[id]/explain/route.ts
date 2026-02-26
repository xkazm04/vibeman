/**
 * API Route: Explain Why This Direction Matters
 *
 * POST /api/directions/[id]/explain
 * Uses LLM to elaborate on why a direction matters for this project's trajectory.
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb, questionDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const direction = directionDb.getDirectionById(id);
    if (!direction) {
      return NextResponse.json(
        { error: 'Direction not found' },
        { status: 404 }
      );
    }

    // Gather context: related questions for this context map
    const relatedQuestions = questionDb
      .getQuestionsByProject(direction.project_id)
      .filter(q => q.context_map_id === direction.context_map_id && q.status === 'answered')
      .slice(0, 5);

    const questionsContext = relatedQuestions.length > 0
      ? relatedQuestions.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')
      : 'No answered questions available for this context.';

    // Check if this is a paired direction
    let pairContext = '';
    if (direction.pair_id) {
      const allDirections = directionDb.getDirectionsByProject(direction.project_id);
      const sibling = allDirections.find(
        d => d.pair_id === direction.pair_id && d.id !== direction.id
      );
      if (sibling) {
        pairContext = `\n\n## Alternative Direction (${sibling.pair_label}):\n${sibling.summary}\n${sibling.direction.slice(0, 300)}`;
      }
    }

    const prompt = `You are a strategic product advisor. A developer is reviewing a proposed direction for their project. Explain in 2-3 concise paragraphs why this direction matters specifically for this project's trajectory.

## Context Area: ${direction.context_name || direction.context_map_title}

## Direction (${direction.pair_label ? `Variant ${direction.pair_label}` : 'Single'}):
**Summary:** ${direction.summary}

**Full Proposal:**
${direction.direction}
${direction.problem_statement ? `\n**Problem Statement:** ${direction.problem_statement}` : ''}
${pairContext}

## Project Decision History:
${questionsContext}

## Task:
Write a compelling explanation of WHY this direction matters for this project. Address:
1. What strategic problem it solves
2. How it connects to decisions already made
3. What risks it mitigates or opportunities it creates
4. Why NOW is the right time (based on project trajectory)

Be specific to THIS project, not generic. Write in second person ("you" / "your project").`;

    const { llmManager } = await import('@/lib/llm');
    const result = await llmManager.generate({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      prompt,
      maxTokens: 1024,
      temperature: 0.6,
      taskType: 'direction-explain',
    });

    const explanation = typeof result.response === 'string' ? result.response : '';

    if (!explanation.trim()) {
      return NextResponse.json(
        { error: 'Failed to generate explanation' },
        { status: 500 }
      );
    }

    logger.info('[API] Direction explanation generated:', {
      directionId: id,
      explanationLength: explanation.length,
    });

    return NextResponse.json({
      success: true,
      explanation,
      directionId: id,
    });
  } catch (error) {
    logger.error('[API] Direction explain error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
