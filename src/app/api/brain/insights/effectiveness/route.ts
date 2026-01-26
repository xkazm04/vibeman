/**
 * Brain Insight Effectiveness API
 * GET: Computes effectiveness scores for insights by correlating
 *      insight creation dates with direction acceptance rate changes.
 *
 * Query params:
 *   - projectId: string (required)
 *   - minDirections: number (optional, default 3) - minimum directions needed for scoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';
import type { LearningInsight } from '@/app/db/models/brain.types';

export interface InsightEffectiveness {
  insightTitle: string;
  insightType: string;
  confidence: number;
  reflectionId: string;
  insightDate: string; // When insight was created (reflection completed_at)
  // Acceptance rates
  preRate: number; // Acceptance rate before insight (0-1)
  postRate: number; // Acceptance rate after insight (0-1)
  preTotal: number; // Total directions before
  postTotal: number; // Total directions after
  // Computed score
  score: number; // Percentage improvement: (post - pre) / max(pre, 0.01)
  verdict: 'helpful' | 'neutral' | 'misleading'; // Based on score thresholds
  reliable: boolean; // Whether sample size is sufficient
}

export interface EffectivenessSummary {
  overallScore: number; // Average score across all scored insights
  helpfulCount: number;
  neutralCount: number;
  misleadingCount: number;
  totalScored: number;
  baselineAcceptanceRate: number; // Overall project acceptance rate
}

interface DirectionCounts {
  accepted: number;
  rejected: number;
  total: number;
}

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const minDirections = parseInt(searchParams.get('minDirections') || '3', 10);

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 }
    );
  }

  try {
    const db = getDatabase();

    // 1. Get all completed reflections with insights for this project
    const reflections = db.prepare(`
      SELECT id, insights_generated, completed_at
      FROM brain_reflections
      WHERE project_id = ? AND status = 'completed' AND insights_generated IS NOT NULL
      ORDER BY completed_at ASC
    `).all(projectId) as Array<{ id: string; insights_generated: string; completed_at: string }>;

    // 2. Get all non-pending directions for this project (accepted or rejected)
    const directions = db.prepare(`
      SELECT status, created_at
      FROM directions
      WHERE project_id = ? AND status IN ('accepted', 'rejected')
      ORDER BY created_at ASC
    `).all(projectId) as Array<{ status: string; created_at: string }>;

    // Compute baseline acceptance rate
    const baselineAccepted = directions.filter(d => d.status === 'accepted').length;
    const baselineAcceptanceRate = directions.length > 0
      ? baselineAccepted / directions.length
      : 0;

    // 3. For each insight, compute before/after acceptance rates
    const results: InsightEffectiveness[] = [];

    for (const reflection of reflections) {
      let insights: LearningInsight[] = [];
      try {
        insights = JSON.parse(reflection.insights_generated);
        if (!Array.isArray(insights)) continue;
      } catch { continue; }

      const insightDate = reflection.completed_at;
      if (!insightDate) continue;

      // Count directions before and after this insight's creation
      const before = countDirections(directions, null, insightDate);
      const after = countDirections(directions, insightDate, null);

      for (const insight of insights) {
        const preRate = before.total > 0 ? before.accepted / before.total : 0;
        const postRate = after.total > 0 ? after.accepted / after.total : 0;

        // Score: percentage improvement relative to pre-rate
        const denominator = Math.max(preRate, 0.01);
        const score = before.total > 0 && after.total > 0
          ? ((postRate - preRate) / denominator) * 100
          : 0;

        // Reliability: need enough directions in both periods
        const reliable = before.total >= minDirections && after.total >= minDirections;

        // Verdict thresholds
        let verdict: 'helpful' | 'neutral' | 'misleading';
        if (!reliable) {
          verdict = 'neutral';
        } else if (score > 10) {
          verdict = 'helpful';
        } else if (score < -10) {
          verdict = 'misleading';
        } else {
          verdict = 'neutral';
        }

        results.push({
          insightTitle: insight.title,
          insightType: insight.type,
          confidence: insight.confidence,
          reflectionId: reflection.id,
          insightDate,
          preRate: Math.round(preRate * 1000) / 1000,
          postRate: Math.round(postRate * 1000) / 1000,
          preTotal: before.total,
          postTotal: after.total,
          score: Math.round(score * 10) / 10,
          verdict,
          reliable,
        });
      }
    }

    // 4. Compute summary
    const scored = results.filter(r => r.reliable);
    const summary: EffectivenessSummary = {
      overallScore: scored.length > 0
        ? Math.round((scored.reduce((s, r) => s + r.score, 0) / scored.length) * 10) / 10
        : 0,
      helpfulCount: scored.filter(r => r.verdict === 'helpful').length,
      neutralCount: scored.filter(r => r.verdict === 'neutral').length,
      misleadingCount: scored.filter(r => r.verdict === 'misleading').length,
      totalScored: scored.length,
      baselineAcceptanceRate: Math.round(baselineAcceptanceRate * 1000) / 1000,
    };

    return NextResponse.json({
      success: true,
      insights: results,
      summary,
    });
  } catch (error) {
    console.error('[Brain Insights Effectiveness] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Count accepted/rejected directions in a date range
 */
function countDirections(
  directions: Array<{ status: string; created_at: string }>,
  afterDate: string | null,
  beforeDate: string | null
): DirectionCounts {
  const filtered = directions.filter(d => {
    if (afterDate && d.created_at <= afterDate) return false;
    if (beforeDate && d.created_at > beforeDate) return false;
    return true;
  });

  const accepted = filtered.filter(d => d.status === 'accepted').length;
  const rejected = filtered.filter(d => d.status === 'rejected').length;
  return { accepted, rejected, total: accepted + rejected };
}

export const GET = withObservability(handleGet, '/api/brain/insights/effectiveness');
