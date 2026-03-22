/**
 * Brain Insight Effectiveness API
 * GET: Computes effectiveness scores for insights by correlating
 *      insight creation dates with direction acceptance rate changes.
 *
 * Uses a 24-hour cache (insight_effectiveness_cache table) to avoid
 * expensive recalculation per request. Cache is invalidated on any
 * direction status change (accepted, rejected, reverted, deleted).
 *
 * Performance: Uses a window-based approach that limits directions to a
 * configurable recent window (default 90 days) and computes pre/post rates
 * within a per-insight window, avoiding unbounded CROSS JOIN growth.
 *
 * Query params:
 *   - projectId: string (required)
 *   - minDirections: number (optional, default 3) - minimum directions needed for scoring
 *   - noCache: boolean (optional) - bypass cache and force recalculation
 *   - windowDays: number (optional, default 90) - direction window in days
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, insightEffectivenessCache } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import { logger } from '@/lib/logger';
import { parseQueryInt } from '@/lib/api-helpers/parseQueryInt';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';
import { EFFECTIVENESS_HELPFUL_THRESHOLD, EFFECTIVENESS_MISLEADING_THRESHOLD } from '@/lib/brain/config';

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
  const noCache = searchParams.get('noCache') === 'true';

  if (!projectId) {
    return buildErrorResponse('projectId is required', { status: 400 });
  }

  let minDirections: number;
  let windowDays: number;

  try {
    minDirections = parseQueryInt(searchParams.get('minDirections'), {
      default: 3,
      min: 1,
      max: 100,
      paramName: 'minDirections',
    });

    windowDays = parseQueryInt(searchParams.get('windowDays'), {
      default: 90,
      min: 1,
      max: 365,
      paramName: 'windowDays',
    });
  } catch (error) {
    return buildErrorResponse(
      error instanceof Error ? error.message : 'Invalid query parameter',
      { status: 400 }
    );
  }

  try {
    // Check cache first (unless explicitly bypassed)
    if (!noCache) {
      try {
        const cached = insightEffectivenessCache.get(projectId, minDirections, windowDays);
        if (cached) {
          try {
            const insights = JSON.parse(cached.insightsJson);
            const summary = JSON.parse(cached.summaryJson);
            logger.debug('[Effectiveness] Cache hit', { projectId, cachedAt: cached.cachedAt, version: cached.version });
            return buildSuccessResponse(
              { insights, summary },
              {
                meta: {
                  cached: true,
                  cachedAt: cached.cachedAt,
                  version: cached.version,
                },
              }
            );
          } catch {
            // Corrupted cache entry — invalidate and fall through to recomputation
            logger.warn('[Effectiveness] Corrupted cache entry, invalidating', { projectId });
            try { insightEffectivenessCache.invalidate(projectId); } catch { /* ignore */ }
          }
        }
      } catch {
        // Cache table might not exist yet (migration pending), fall through to compute
      }
    }

    const db = getDatabase();

    // 1. Compute baseline acceptance rate (windowed to recent directions)
    const baseline = db.prepare(`
      SELECT
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) AS accepted,
        COUNT(*) AS total
      FROM directions
      WHERE project_id = ? AND status IN ('accepted', 'rejected')
        AND created_at >= DATE('now', '-' || ? || ' days')
    `).get(projectId, windowDays) as { accepted: number; total: number } | undefined;

    const baselineAcceptanceRate = baseline && baseline.total > 0
      ? baseline.accepted / baseline.total
      : 0;

    // 2. Fetch all insights (lightweight — typically tens, not thousands)
    const allInsights = db.prepare(`
      SELECT bi.id, bi.title, bi.type, bi.confidence, bi.reflection_id, br.completed_at AS insight_date
      FROM brain_insights bi
      JOIN brain_reflections br ON bi.reflection_id = br.id
      WHERE bi.project_id = ? AND br.status = 'completed' AND br.completed_at IS NOT NULL
      ORDER BY br.completed_at ASC
    `).all(projectId) as Array<{
      id: string; title: string; type: string; confidence: number;
      reflection_id: string; insight_date: string;
    }>;

    // 3. Fetch windowed directions once (O(D) where D = directions in window)
    const directions = db.prepare(`
      SELECT created_at, status
      FROM directions
      WHERE project_id = ? AND status IN ('accepted', 'rejected')
        AND created_at >= DATE('now', '-' || ? || ' days')
      ORDER BY created_at ASC
    `).all(projectId, windowDays) as Array<{ created_at: string; status: string }>;

    // 4. Build prefix sum of accepted counts for O(1) range queries.
    //    prefixAccepted[i] = number of accepted directions in directions[0..i-1]
    const prefixAccepted = new Array(directions.length + 1);
    prefixAccepted[0] = 0;
    for (let i = 0; i < directions.length; i++) {
      prefixAccepted[i + 1] = prefixAccepted[i] + (directions[i].status === 'accepted' ? 1 : 0);
    }
    const totalAccepted = prefixAccepted[directions.length];

    // 5. For each insight, compute pre/post using binary search + prefix sum.
    //    This is O(I * log(D)) total instead of O(I * D) from the CROSS JOIN.
    const results: InsightEffectiveness[] = [];

    for (const insight of allInsights) {
      const insightDate = insight.insight_date;

      // Binary search for the split point
      let lo = 0, hi = directions.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (directions[mid].created_at <= insightDate) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }
      // lo = index of first direction after insight_date

      const preTotal = lo;
      const postTotal = directions.length - lo;
      const preAccepted = prefixAccepted[lo];
      const postAccepted = totalAccepted - preAccepted;

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
      } else if (score > EFFECTIVENESS_HELPFUL_THRESHOLD) {
        verdict = 'helpful';
      } else if (score < EFFECTIVENESS_MISLEADING_THRESHOLD) {
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

    // 6. Compute summary
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

    // 7. Store in cache for future requests
    let cacheVersion = 1;
    try {
      insightEffectivenessCache.set(
        projectId,
        minDirections,
        windowDays,
        JSON.stringify(results),
        JSON.stringify(summary)
      );
      // Retrieve the version that was just written
      const freshCache = insightEffectivenessCache.get(projectId, minDirections, windowDays);
      cacheVersion = freshCache?.version || 1;
      logger.debug('[Effectiveness] Cached results', { projectId, insightCount: results.length, version: cacheVersion });
    } catch {
      // Cache write failure is non-critical - just skip caching
    }

    return buildSuccessResponse(
      {
        insights: results,
        summary,
      },
      {
        meta: {
          cached: false,
          version: cacheVersion,
        },
      }
    );
  } catch (error) {
    logger.error('[Brain Insights Effectiveness] Error:', { error });
    return buildErrorResponse('Failed to compute insight effectiveness');
  }
}


export const GET = withObservability(withRateLimit(handleGet, '/api/brain/insights/effectiveness', 'strict'), '/api/brain/insights/effectiveness');
