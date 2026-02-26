/**
 * API Route: Idea Re-evaluation
 *
 * POST /api/ideas/re-evaluate
 * Fetches all ideas without effort/impact/risk estimations and
 * uses Claude to evaluate and save them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { getDatabase } from '@/app/db/connection';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import { logger } from '@/lib/logger';
import type { DbIdea } from '@/app/db/models/types';

/**
 * Get all ideas that are missing effort/impact/risk estimations
 */
function getIdeasWithoutEstimations(projectId?: string): DbIdea[] {
  const db = getDatabase();
  const query = projectId
    ? `SELECT * FROM ideas WHERE (effort IS NULL OR impact IS NULL OR risk IS NULL) AND status IN ('pending', 'accepted') AND project_id = ? ORDER BY created_at DESC`
    : `SELECT * FROM ideas WHERE (effort IS NULL OR impact IS NULL OR risk IS NULL) AND status IN ('pending', 'accepted') ORDER BY created_at DESC`;

  const stmt = db.prepare(query);
  return (projectId ? stmt.all(projectId) : stmt.all()) as DbIdea[];
}

/**
 * Build a prompt for Claude to evaluate ideas
 */
function buildEvaluationPrompt(ideas: DbIdea[]): string {
  const ideasList = ideas.map((idea, i) => {
    return `${i + 1}. [ID: ${idea.id}] "${idea.title}" (category: ${idea.category})
   Description: ${idea.description || 'No description'}`;
  }).join('\n\n');

  return `You are evaluating software development ideas. For each idea below, estimate:
- **effort** (1-10): 1 = trivial (hours), 5 = moderate (days), 10 = massive (months)
- **impact** (1-10): 1 = negligible improvement, 5 = meaningful improvement, 10 = transformational
- **risk** (1-10): 1 = very safe, 5 = moderate risk, 10 = could break critical systems

Respond ONLY with a JSON array. Each element must have: { "id": "<idea_id>", "effort": <number>, "impact": <number>, "risk": <number> }

Ideas to evaluate:

${ideasList}

Respond with the JSON array only, no markdown fences, no explanation.`;
}

/**
 * POST /api/ideas/re-evaluate
 * Evaluate all ideas without effort/impact/risk and save results
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { projectId } = body as { projectId?: string };

    // Get ideas without estimations
    const ideas = getIdeasWithoutEstimations(projectId);

    if (ideas.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All ideas already have estimations',
        evaluated: 0,
        total: 0,
      });
    }

    // Process in batches of 20
    const BATCH_SIZE = 20;
    let totalEvaluated = 0;

    for (let i = 0; i < ideas.length; i += BATCH_SIZE) {
      const batch = ideas.slice(i, i + BATCH_SIZE);
      const prompt = buildEvaluationPrompt(batch);

      try {
        // Call Claude API for evaluation
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY || '',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (!response.ok) {
          logger.error('[ReEvaluate] Claude API error', { status: response.status });
          continue;
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || '';

        // Parse JSON response
        let evaluations: Array<{ id: string; effort: number; impact: number; risk: number }>;
        try {
          evaluations = JSON.parse(content.trim());
        } catch {
          logger.error('[ReEvaluate] Failed to parse Claude response', { content: content.substring(0, 200) });
          continue;
        }

        // Save evaluations to database
        for (const evaluation of evaluations) {
          if (!evaluation.id || !evaluation.effort || !evaluation.impact || !evaluation.risk) continue;

          const effort = Math.min(10, Math.max(1, Math.round(evaluation.effort)));
          const impact = Math.min(10, Math.max(1, Math.round(evaluation.impact)));
          const risk = Math.min(10, Math.max(1, Math.round(evaluation.risk)));

          try {
            ideaDb.updateIdea(evaluation.id, { effort, impact, risk });
            totalEvaluated++;
          } catch (err) {
            logger.error('[ReEvaluate] Failed to update idea', { ideaId: evaluation.id, err });
          }
        }
      } catch (err) {
        logger.error('[ReEvaluate] Batch evaluation failed', { batchStart: i, err });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Evaluated ${totalEvaluated} of ${ideas.length} ideas`,
      evaluated: totalEvaluated,
      total: ideas.length,
    });
  } catch (error) {
    logger.error('[ReEvaluate] Error:', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ideas/re-evaluate
 * Get count of ideas that need re-evaluation
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;

    const ideas = getIdeasWithoutEstimations(projectId);

    return NextResponse.json({
      success: true,
      count: ideas.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(withRateLimit(handlePost, '/api/ideas/re-evaluate', 'strict'), '/api/ideas/re-evaluate');
export const GET = withObservability(handleGet, '/api/ideas/re-evaluate');
