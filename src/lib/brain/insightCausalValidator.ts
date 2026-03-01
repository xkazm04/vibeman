/**
 * Insight Causal Validator
 *
 * Computes causal effectiveness scores by comparing outcomes for
 * insight-influenced decisions vs non-influenced decisions (control group).
 *
 * Unlike the proxy-based effectiveness score (which correlates insight dates
 * with acceptance rates), this measures actual causal impact by tracking
 * which insights were SHOWN to users during decision-making.
 *
 * Causal Score = (influenced_acceptance_rate - baseline_acceptance_rate) / max(baseline, 0.01) * 100
 *
 * Where:
 *   - influenced_acceptance_rate = acceptance rate when insight was visible
 *   - baseline_acceptance_rate = acceptance rate for non-influenced decisions (control)
 */

import { insightInfluenceRepository } from '@/app/db/repositories/insight-influence.repository';
import { getDatabase } from '@/app/db/connection';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CausalInsightScore {
  insightId: string;
  insightTitle: string;
  /** Acceptance rate when this insight was shown (0-1) */
  influencedRate: number;
  /** Number of decisions where insight was shown */
  influencedTotal: number;
  /** Acceptance count when insight was shown */
  influencedAccepted: number;
  /** Acceptance rate for non-influenced decisions (0-1) */
  baselineRate: number;
  /** Number of non-influenced decisions */
  baselineTotal: number;
  /** Causal score: % improvement over baseline */
  causalScore: number;
  /** Verdict based on causal score */
  causalVerdict: 'helpful' | 'neutral' | 'misleading';
  /** Whether sample sizes are sufficient for reliability */
  reliable: boolean;
}

export interface CausalValidationReport {
  projectId: string;
  /** Per-insight causal scores */
  insights: CausalInsightScore[];
  /** Overall causal effectiveness across all insights */
  overallCausalScore: number;
  /** Baseline acceptance rate (non-influenced decisions) */
  baselineAcceptanceRate: number;
  /** Influenced acceptance rate (weighted across all insights) */
  influencedAcceptanceRate: number;
  /** Total influence events recorded */
  totalInfluenceEvents: number;
  /** How many insights have sufficient data for causal scoring */
  reliableCount: number;
  /** Verdict breakdown */
  helpfulCount: number;
  neutralCount: number;
  misleadingCount: number;
  generatedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Minimum influenced decisions per insight for reliable scoring */
const MIN_INFLUENCED_DECISIONS = 3;

/** Minimum non-influenced decisions for a reliable baseline */
const MIN_BASELINE_DECISIONS = 3;

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * Compute causal effectiveness scores for all insights in a project.
 */
export function computeCausalScores(projectId: string): CausalValidationReport {
  const db = getDatabase();

  // 1. Get per-insight influence stats
  const influenceStats = insightInfluenceRepository.getCausalStats(projectId);

  // 2. Get baseline: acceptance rate for non-influenced decisions
  const baselineRow = db.prepare(`
    SELECT
      COUNT(CASE WHEN d.status = 'accepted' THEN 1 END) AS accepted,
      COUNT(*) AS total
    FROM directions d
    WHERE d.project_id = ? AND d.status IN ('accepted', 'rejected')
      AND d.id NOT IN (SELECT direction_id FROM insight_influence_log WHERE project_id = ?)
  `).get(projectId, projectId) as { accepted: number; total: number } | undefined;

  const baselineAccepted = baselineRow?.accepted ?? 0;
  const baselineTotal = baselineRow?.total ?? 0;
  const baselineRate = baselineTotal > 0 ? baselineAccepted / baselineTotal : 0;

  // 3. Compute per-insight causal scores
  const insights: CausalInsightScore[] = influenceStats.map((stat) => {
    const influencedRate = stat.influenced_total > 0
      ? stat.influenced_accepted / stat.influenced_total
      : 0;

    const denominator = Math.max(baselineRate, 0.01);
    const causalScore = stat.influenced_total > 0 && baselineTotal > 0
      ? ((influencedRate - baselineRate) / denominator) * 100
      : 0;

    const reliable =
      stat.influenced_total >= MIN_INFLUENCED_DECISIONS &&
      baselineTotal >= MIN_BASELINE_DECISIONS;

    let causalVerdict: CausalInsightScore['causalVerdict'];
    if (!reliable) {
      causalVerdict = 'neutral';
    } else if (causalScore > 10) {
      causalVerdict = 'helpful';
    } else if (causalScore < -10) {
      causalVerdict = 'misleading';
    } else {
      causalVerdict = 'neutral';
    }

    return {
      insightId: stat.insight_id,
      insightTitle: stat.insight_title,
      influencedRate: Math.round(influencedRate * 1000) / 1000,
      influencedTotal: stat.influenced_total,
      influencedAccepted: stat.influenced_accepted,
      baselineRate: Math.round(baselineRate * 1000) / 1000,
      baselineTotal,
      causalScore: Math.round(causalScore * 10) / 10,
      causalVerdict,
      reliable,
    };
  });

  // 4. Compute overall causal score (weighted by sample size)
  const reliableInsights = insights.filter((i) => i.reliable);
  const totalInfluenced = influenceStats.reduce((s, i) => s + i.influenced_total, 0);
  const totalInfluencedAccepted = influenceStats.reduce((s, i) => s + i.influenced_accepted, 0);
  const influencedAcceptanceRate = totalInfluenced > 0
    ? totalInfluencedAccepted / totalInfluenced
    : 0;

  const overallDenominator = Math.max(baselineRate, 0.01);
  const overallCausalScore = totalInfluenced > 0 && baselineTotal > 0
    ? ((influencedAcceptanceRate - baselineRate) / overallDenominator) * 100
    : 0;

  return {
    projectId,
    insights,
    overallCausalScore: Math.round(overallCausalScore * 10) / 10,
    baselineAcceptanceRate: Math.round(baselineRate * 1000) / 1000,
    influencedAcceptanceRate: Math.round(influencedAcceptanceRate * 1000) / 1000,
    totalInfluenceEvents: totalInfluenced,
    reliableCount: reliableInsights.length,
    helpfulCount: reliableInsights.filter((i) => i.causalVerdict === 'helpful').length,
    neutralCount: reliableInsights.filter((i) => i.causalVerdict === 'neutral').length,
    misleadingCount: reliableInsights.filter((i) => i.causalVerdict === 'misleading').length,
    generatedAt: new Date().toISOString(),
  };
}
