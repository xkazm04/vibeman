/**
 * API Route: Generate Strategic Brief
 *
 * POST /api/questions/[id]/strategic-brief
 * When a question tree reaches 3+ levels deep, auto-generates a Strategic Brief
 * that synthesizes all Q&A decisions into a product vision statement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { questionDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;

    const question = questionDb.getQuestionById(questionId);
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Get the full ancestry chain
    const chain = questionDb.getAncestryChain(questionId);
    const answeredChain = chain.filter(q => q.status === 'answered' && q.answer);

    if (answeredChain.length < 3) {
      return NextResponse.json(
        { error: 'Strategic brief requires at least 3 levels of answered questions' },
        { status: 400 }
      );
    }

    // Build the decision chain text
    const decisionChain = answeredChain.map((q, i) => ({
      depth: i,
      question: q.question,
      answer: q.answer!,
      context: q.context_map_title,
    }));

    // Generate the strategic brief
    const { llmManager } = await import('@/lib/llm');
    const prompt = buildStrategicBriefPrompt(decisionChain);

    const result = await llmManager.generate({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      prompt,
      maxTokens: 4096,
      temperature: 0.5,
      taskType: 'strategic-brief',
    });

    const brief = typeof result.response === 'string' ? result.response : '';

    if (!brief.trim()) {
      return NextResponse.json(
        { error: 'Failed to generate strategic brief' },
        { status: 500 }
      );
    }

    // Save the brief on the root question of the chain
    const rootQuestion = chain[0];
    questionDb.saveStrategicBrief(rootQuestion.id, brief);

    logger.info('[API] Strategic brief generated:', {
      rootQuestionId: rootQuestion.id,
      chainLength: answeredChain.length,
      briefLength: brief.length,
    });

    return NextResponse.json({
      success: true,
      brief,
      rootQuestionId: rootQuestion.id,
      chainLength: answeredChain.length,
      decisionChain: decisionChain.map(d => ({
        question: d.question,
        answer: d.answer,
        depth: d.depth,
      })),
    });
  } catch (error) {
    logger.error('[API] Strategic brief error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function buildStrategicBriefPrompt(
  chain: Array<{ depth: number; question: string; answer: string; context: string }>
): string {
  const contextArea = chain[0]?.context || 'Unknown';
  const chainText = chain
    .map((d, i) => `### Level ${i + 1}\n**Q:** ${d.question}\n**A:** ${d.answer}`)
    .join('\n\n');

  return `You are a strategic product advisor. A developer has gone through a cascading decision tree, answering increasingly specific questions about their development direction.

## Context Area: ${contextArea}

## Decision Chain (${chain.length} levels deep):
${chainText}

## Task:
Synthesize all decisions above into a **Strategic Brief** — a concise product vision document. The brief should:

1. **Vision Statement** (1-2 sentences): What they're building and why
2. **Key Decisions** (bullet points): The specific choices made at each level
3. **Architecture Implications**: What these choices mean for technical implementation
4. **Trade-offs Accepted**: What was implicitly or explicitly traded away
5. **Recommended Next Steps**: 2-3 concrete actionable items to move forward

Write in a clear, professional tone. The brief should feel like a mini-PRD derived from real decision-making, not generic advice.

Format with markdown headers and bullet points.`;
}
