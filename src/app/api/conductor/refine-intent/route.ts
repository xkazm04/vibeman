/**
 * Intent Refinement API (G5)
 *
 * POST: Analyzes a goal for ambiguity and returns clarifying questions.
 * The user answers these questions, and the Q&A pairs become the
 * `refinedIntent` that gets passed to Goal Analyzer and Planner.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withValidation } from '@/lib/api/withValidation';
import { RefineIntentPostBodySchema, type RefineIntentPostBody } from '@/lib/api/schemas/conductor';

export const POST = withValidation(
  RefineIntentPostBodySchema,
  async (_request: NextRequest, body: RefineIntentPostBody) => {
  const { goalTitle, goalDescription } = body;
  try {
    const prompt = `You are a senior technical lead reviewing a development goal before it enters an autonomous pipeline. Your job is to identify ambiguities, missing context, or unclear scope that could cause the pipeline to produce poor results.

## Goal

**${goalTitle || 'Untitled Goal'}**

${goalDescription}

## Task

Generate 3-5 clarifying questions that would help refine this goal. Focus on:
- Ambiguous scope (what's in/out of scope?)
- Missing technical constraints (framework versions, patterns to follow?)
- Priority conflicts (which aspect matters most if trade-offs are needed?)
- Success criteria (how will we know this is done correctly?)

Do NOT ask obvious questions or questions answered by the goal description itself.

## Output Format

Respond with ONLY valid JSON (no markdown fences):

{
  "questions": [
    {
      "id": "q1",
      "question": "The clarifying question",
      "context": "Brief explanation of why this matters"
    }
  ]
}`;

    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'sonnet',
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `LLM call failed: ${response.status}` },
        { status: 502 }
      );
    }

    const responseText = await response.text();

    // Parse response
    try {
      let cleaned = responseText;
      const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) cleaned = fenceMatch[1];

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          { success: false, error: 'Failed to parse LLM response' },
          { status: 500 }
        );
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const questions = Array.isArray(parsed.questions)
        ? parsed.questions
            .filter((q: Record<string, unknown>) => q && typeof q.question === 'string')
            .slice(0, 5)
            .map((q: Record<string, unknown>, i: number) => ({
              id: String(q.id || `q${i + 1}`),
              question: String(q.question),
              context: String(q.context || ''),
            }))
        : [];

      return NextResponse.json({ success: true, questions });
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to parse LLM response' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[conductor/refine-intent] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
