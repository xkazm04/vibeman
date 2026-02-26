import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { generateWithLLM } from '@/lib/llm';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import { checkProjectAccess } from '@/lib/api-helpers/accessControl';

export interface IdeaVariant {
  scope: 'mvp' | 'standard' | 'ambitious';
  label: string;
  title: string;
  description: string;
  effort: number;
  impact: number;
  risk: number;
  reasoning: string;
}

interface GenerateVariantsRequest {
  ideaId: string;
}

const VARIANT_SYSTEM_PROMPT = `You are an expert software architect. Given an idea for a software project, generate exactly 3 variants at different scope levels. Each variant should be a practical, actionable version of the same core idea.

Return ONLY a JSON array with exactly 3 objects, no markdown, no explanation. Each object must have:
- "scope": one of "mvp", "standard", "ambitious"
- "label": a short 2-4 word label for this scope (e.g. "Quick Fix", "Full Feature", "Platform Upgrade")
- "title": a concise title for this variant
- "description": 2-4 sentences describing what this variant implements
- "effort": integer 1-10 (1=trivial hours, 10=months of work)
- "impact": integer 1-10 (1=negligible, 10=transformational)
- "risk": integer 1-10 (1=very safe, 10=critical risk)
- "reasoning": 1 sentence explaining why this scope level makes sense`;

function buildVariantPrompt(idea: {
  title: string;
  description: string | null;
  category: string;
  effort: number | null;
  impact: number | null;
  risk: number | null;
}): string {
  return `Generate 3 scope variants for this software idea:

Title: ${idea.title}
Category: ${idea.category}
Description: ${idea.description || 'No description provided'}
Current Scores: Effort=${idea.effort ?? 'N/A'}, Impact=${idea.impact ?? 'N/A'}, Risk=${idea.risk ?? 'N/A'}

Rules:
- MVP variant: ~30% of full scope. Minimal viable version. Low effort, moderate impact.
- Standard variant: The original idea as-is. Keep scores close to current if provided.
- Ambitious variant: Extended version with additional capabilities. Higher effort and impact.
- All effort/impact/risk scores must be integers 1-10.
- Return ONLY a JSON array, no markdown fences.`;
}

function parseVariantsResponse(response: string): IdeaVariant[] {
  // Try to extract JSON array from response
  let cleaned = response.trim();

  // Remove markdown code fences if present
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }

  // Find array bounds
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) {
    throw new Error('No JSON array found in response');
  }
  cleaned = cleaned.substring(start, end + 1);

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed) || parsed.length !== 3) {
    throw new Error('Expected exactly 3 variants');
  }

  return parsed.map((v: Record<string, unknown>) => ({
    scope: String(v.scope) as IdeaVariant['scope'],
    label: String(v.label || ''),
    title: String(v.title || ''),
    description: String(v.description || ''),
    effort: Math.max(1, Math.min(10, Number(v.effort) || 5)),
    impact: Math.max(1, Math.min(10, Number(v.impact) || 5)),
    risk: Math.max(1, Math.min(10, Number(v.risk) || 5)),
    reasoning: String(v.reasoning || ''),
  }));
}

/**
 * POST /api/ideas/variants
 * Generate 3 scope variants (MVP, Standard, Ambitious) for an idea
 */
async function handlePost(request: NextRequest) {
  try {
    const body: GenerateVariantsRequest = await request.json();

    if (!body.ideaId || typeof body.ideaId !== 'string') {
      return NextResponse.json({ error: 'ideaId is required' }, { status: 400 });
    }

    const idea = ideaDb.getIdeaById(body.ideaId);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Verify project access
    if (idea.project_id) {
      const accessDenied = checkProjectAccess(idea.project_id, request);
      if (accessDenied) return accessDenied;
    }

    const prompt = buildVariantPrompt(idea);

    const result = await generateWithLLM(prompt, {
      projectId: idea.project_id,
      taskType: 'idea_variants',
      taskDescription: `Generate scope variants for: ${idea.title}`,
      maxTokens: 2000,
      temperature: 0.7,
      systemPrompt: VARIANT_SYSTEM_PROMPT,
    });

    if (!result.success || !result.response) {
      logger.error('[API /ideas/variants] LLM call failed:', { error: result.error });
      return NextResponse.json(
        { error: 'Failed to generate variants', details: result.error },
        { status: 502 }
      );
    }

    const variants = parseVariantsResponse(result.response);

    return NextResponse.json({
      success: true,
      ideaId: idea.id,
      variants,
      usage: result.usage,
    });
  } catch (error) {
    logger.error('[API /ideas/variants] Error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to generate variants' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(
  withRateLimit(handlePost, '/api/ideas/variants', 'standard'),
  '/api/ideas/variants'
);
