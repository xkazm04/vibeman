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

    // 1. Compute baseline acceptance rate in a single query
    const baseline = db.prepare(`
      SELECT
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) AS accepted,
        COUNT(*) AS total
      FROM directions
      WHERE project_id = ? AND status IN ('accepted', 'rejected')
    `).get(projectId) as { accepted: number; total: number } | undefined;

    const baselineAcceptanceRate = baseline && baseline.total > 0
      ? baseline.accepted / baseline.total
      : 0;

    // 2. Single SQL query: compute pre/post direction counts for every insight at once.
    //    Uses a CROSS JOIN between insights and directions, with conditional aggregation
    //    to bucket directions into "before" and "after" each insight's completion date.
    //    This moves O(insights × directions) filtering from JS into SQLite's C engine.
    const rows = db.prepare(`
      SELECT
        bi.id AS insight_id,
        bi.title,
        bi.type,
        bi.confidence,
        bi.reflection_id,
        br.completed_at AS insight_date,
        COUNT(CASE WHEN d.created_at <= br.completed_at AND d.status = 'accepted' THEN 1 END) AS pre_accepted,
        COUNT(CASE WHEN d.created_at <= br.completed_at THEN 1 END) AS pre_total,
        COUNT(CASE WHEN d.created_at > br.completed_at AND d.status = 'accepted' THEN 1 END) AS post_accepted,
        COUNT(CASE WHEN d.created_at > br.completed_at THEN 1 END) AS post_total
      FROM brain_insights bi
      JOIN brain_reflections br ON bi.reflection_id = br.id
      CROSS JOIN directions d
      WHERE bi.project_id = ?
        AND br.status = 'completed'
        AND br.completed_at IS NOT NULL
        AND d.project_id = ?
        AND d.status IN ('accepted', 'rejected')
      GROUP BY bi.id
      ORDER BY br.completed_at ASC
    `).all(projectId, projectId) as Array<{
      insight_id: string;
      title: string;
      type: string;
      confidence: number;
      reflection_id: string;
      insight_date: string;
      pre_accepted: number;
      pre_total: number;
      post_accepted: number;
      post_total: number;
    }>;

    // 3. Also fetch insights that may have no matching directions (they get score 0)
    const insightsWithNoDirections = db.prepare(`
      SELECT bi.id, bi.title, bi.type, bi.confidence, bi.reflection_id, br.completed_at AS insight_date
      FROM brain_insights bi
      JOIN brain_reflections br ON bi.reflection_id = br.id
      WHERE bi.project_id = ? AND br.status = 'completed' AND br.completed_at IS NOT NULL
    `).all(projectId) as Array<{
      id: string; title: string; type: string; confidence: number;
      reflection_id: string; insight_date: string;
    }>;

    // Build a lookup from the aggregated rows
    const aggregated = new Map(rows.map(r => [r.insight_id, r]));

    // 4. Build results from the aggregated data
    const results: InsightEffectiveness[] = [];

    for (const insight of insightsWithNoDirections) {
      const agg = aggregated.get(insight.id);
      const preTotal = agg?.pre_total ?? 0;
      const postTotal = agg?.post_total ?? 0;
      const preAccepted = agg?.pre_accepted ?? 0;
      const postAccepted = agg?.post_accepted ?? 0;

      const preRate = preTotal > 0 ? preAccepted / preTotal : 0;
      const postRate = postTotal > 0 ? postAccepted / postTotal : 0;

      const denominator = Math.max(preRate, 0.01);
      const score = preTotal > 0 && postTotal > 0
        ? ((postRate - preRate) / denominator) * 100
        : 0;

      const reliable = preTotal >= minDirections && postTotal >= minDirections;

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
        reflectionId: insight.reflection_id,
        insightDate: insight.insight_date,
        preRate: Math.round(preRate * 1000) / 1000,
        postRate: Math.round(postRate * 1000) / 1000,
        preTotal: preTotal,
        postTotal: postTotal,
        score: Math.round(score * 10) / 10,
        verdict,
        reliable,
      });
    }

    // 5. Compute summary
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


export const GET = withObservability(handleGet, '/api/brain/insights/effectiveness');
