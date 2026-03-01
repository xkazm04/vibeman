/**
 * Preference Learning Engine
 *
 * Classifies historical direction pair decisions into approach archetypes
 * and computes a preference profile that can be injected into the direction
 * generation prompt to weight variant generation toward the user's
 * demonstrated engineering style.
 *
 * Archetypes:
 *   quick_win vs comprehensive  — Speed vs thoroughness
 *   build vs buy               — Custom vs library/third-party
 *   incremental vs architectural — Targeted changes vs structural rewrites
 *   pragmatic vs idealistic     — "Good enough" vs "perfectly principled"
 *
 * Each archetype is a spectrum from 0.0 (strongly favors the first pole)
 * to 1.0 (strongly favors the second pole). 0.5 = no preference.
 */

import { getDatabase } from '@/app/db/connection';
import type { DbDirection } from '@/app/db/models/types';

// ── Types ────────────────────────────────────────────────────────────────────

export type ArchetypeAxis =
  | 'quick_win_vs_comprehensive'
  | 'build_vs_buy'
  | 'incremental_vs_architectural'
  | 'pragmatic_vs_idealistic';

export interface ArchetypeClassification {
  axis: ArchetypeAxis;
  /** 0.0 = left pole, 1.0 = right pole, null = can't classify on this axis */
  acceptedPosition: number | null;
  rejectedPosition: number | null;
  confidence: number; // 0-1, how clearly this pair maps to this axis
}

export interface PairDecision {
  pairId: string;
  accepted: DbDirection;
  rejected: DbDirection;
  decidedAt: string;
  classifications: ArchetypeClassification[];
}

export interface PreferenceVector {
  /** Per-axis preference: 0.0-1.0, 0.5 = neutral */
  quick_win_vs_comprehensive: number;
  build_vs_buy: number;
  incremental_vs_architectural: number;
  pragmatic_vs_idealistic: number;
}

export interface PreferenceProfile {
  projectId: string;
  vector: PreferenceVector;
  /** Number of pair decisions used to compute the profile */
  sampleCount: number;
  /** Per-axis sample counts */
  axisCounts: Record<ArchetypeAxis, number>;
  /** How stable the preferences are (higher = more consistent) */
  stability: number; // 0-1
  computedAt: string;
}

// ── Signal Words ─────────────────────────────────────────────────────────────

const QUICK_WIN_SIGNALS = [
  'quick', 'simple', 'minimal', 'lightweight', 'lean', 'fast', 'rapid',
  'straightforward', 'small', 'short-term', 'easy', 'low-effort', 'basic',
  'pragmatic fix', 'patch', 'hotfix', 'band-aid',
];

const COMPREHENSIVE_SIGNALS = [
  'comprehensive', 'thorough', 'complete', 'full', 'extensive', 'robust',
  'scalable', 'production-grade', 'enterprise', 'long-term', 'future-proof',
  'systematic', 'holistic', 'end-to-end', 'mature',
];

const BUILD_SIGNALS = [
  'custom', 'hand-built', 'bespoke', 'from scratch', 'in-house',
  'home-grown', 'tailored', 'purpose-built', 'native', 'proprietary',
  'create our own', 'implement from',
];

const BUY_SIGNALS = [
  'library', 'package', 'third-party', 'external', 'saas', 'service',
  'plugin', 'integration', 'off-the-shelf', 'existing solution',
  'open-source', 'framework', 'sdk', 'adopt', 'leverage existing',
];

const INCREMENTAL_SIGNALS = [
  'incremental', 'gradual', 'targeted', 'focused', 'scoped', 'localized',
  'surgical', 'refactor', 'improve', 'enhance', 'extend', 'add to',
  'build on', 'iterate', 'evolve',
];

const ARCHITECTURAL_SIGNALS = [
  'architectural', 'rewrite', 'redesign', 'overhaul', 'replace', 'migrate',
  'rearchitect', 'restructure', 'new system', 'from the ground up',
  'greenfield', 'foundation', 'paradigm shift', 'transformation',
];

const PRAGMATIC_SIGNALS = [
  'pragmatic', 'practical', 'good enough', 'mvp', 'ship it', 'working',
  'functional', 'acceptable', 'reasonable', 'trade-off', 'compromise',
  'expedient', 'deliver now',
];

const IDEALISTIC_SIGNALS = [
  'clean', 'pure', 'elegant', 'best practice', 'principled', 'correct',
  'proper', 'type-safe', 'idiomatic', 'canonical', 'gold standard',
  'zero-compromise', 'by the book', 'perfect',
];

// ── Classification ───────────────────────────────────────────────────────────

function scoreText(text: string, signals: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const signal of signals) {
    // Count occurrences (both in summary and direction body)
    const regex = new RegExp(signal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = lower.match(regex);
    if (matches) {
      score += matches.length;
    }
  }
  return score;
}

function classifyOnAxis(
  direction: DbDirection,
  leftSignals: string[],
  rightSignals: string[],
): { position: number; confidence: number } {
  const text = `${direction.summary} ${direction.direction}`;
  const leftScore = scoreText(text, leftSignals);
  const rightScore = scoreText(text, rightSignals);
  const total = leftScore + rightScore;

  if (total === 0) {
    return { position: 0.5, confidence: 0 };
  }

  const position = rightScore / total; // 0 = fully left, 1 = fully right
  // Confidence scales with total signal count (diminishing returns)
  const confidence = Math.min(1, Math.log(total + 1) / Math.log(10));

  return { position, confidence };
}

const AXES: Array<{
  axis: ArchetypeAxis;
  leftSignals: string[];
  rightSignals: string[];
}> = [
  { axis: 'quick_win_vs_comprehensive', leftSignals: QUICK_WIN_SIGNALS, rightSignals: COMPREHENSIVE_SIGNALS },
  { axis: 'build_vs_buy', leftSignals: BUILD_SIGNALS, rightSignals: BUY_SIGNALS },
  { axis: 'incremental_vs_architectural', leftSignals: INCREMENTAL_SIGNALS, rightSignals: ARCHITECTURAL_SIGNALS },
  { axis: 'pragmatic_vs_idealistic', leftSignals: PRAGMATIC_SIGNALS, rightSignals: IDEALISTIC_SIGNALS },
];

function classifyPair(accepted: DbDirection, rejected: DbDirection): ArchetypeClassification[] {
  return AXES.map(({ axis, leftSignals, rightSignals }) => {
    const acceptedResult = classifyOnAxis(accepted, leftSignals, rightSignals);
    const rejectedResult = classifyOnAxis(rejected, leftSignals, rightSignals);

    // Only classify with reasonable confidence
    const minConfidence = Math.min(acceptedResult.confidence, rejectedResult.confidence);

    return {
      axis,
      acceptedPosition: acceptedResult.confidence > 0 ? acceptedResult.position : null,
      rejectedPosition: rejectedResult.confidence > 0 ? rejectedResult.position : null,
      confidence: minConfidence,
    };
  });
}

// ── Historical Analysis ──────────────────────────────────────────────────────

const MAX_DECISIONS = 30;
const MIN_CONFIDENCE_THRESHOLD = 0.15;

/**
 * Load the most recent pair decisions for a project where one was accepted
 * and the other rejected.
 */
export function loadPairDecisions(projectId: string, limit: number = MAX_DECISIONS): PairDecision[] {
  const db = getDatabase();

  // Get pairs where one direction was accepted and the other rejected
  const rows = db.prepare(`
    SELECT d.*, d2.id AS paired_id
    FROM directions d
    JOIN directions d2 ON d.pair_id = d2.pair_id AND d.id != d2.id
    WHERE d.project_id = ?
      AND d.pair_id IS NOT NULL
      AND d.status = 'accepted'
      AND d2.status = 'rejected'
    ORDER BY d.updated_at DESC
    LIMIT ?
  `).all(projectId, limit) as Array<DbDirection & { paired_id: string }>;

  const decisions: PairDecision[] = [];

  for (const acceptedRow of rows) {
    const rejected = db.prepare('SELECT * FROM directions WHERE id = ?').get(acceptedRow.paired_id) as DbDirection | undefined;
    if (!rejected) continue;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { paired_id: _pairedId, ...acceptedFields } = acceptedRow;
    const accepted = acceptedFields as DbDirection;

    const classifications = classifyPair(accepted, rejected);
    decisions.push({
      pairId: accepted.pair_id!,
      accepted,
      rejected,
      decidedAt: accepted.updated_at,
      classifications,
    });
  }

  return decisions;
}

// ── Preference Computation ───────────────────────────────────────────────────

/**
 * Compute the preference vector from a set of pair decisions.
 *
 * For each axis, we look at pairs where the classification is confident
 * and compute the weighted average of the accepted direction's position.
 * A user who always accepts the "quick win" variant will skew toward 0.0
 * on that axis; one who always picks comprehensive will skew toward 1.0.
 */
export function computePreferenceVector(decisions: PairDecision[]): {
  vector: PreferenceVector;
  axisCounts: Record<ArchetypeAxis, number>;
  stability: number;
} {
  const axisAccumulator: Record<ArchetypeAxis, { positions: number[]; weights: number[] }> = {
    quick_win_vs_comprehensive: { positions: [], weights: [] },
    build_vs_buy: { positions: [], weights: [] },
    incremental_vs_architectural: { positions: [], weights: [] },
    pragmatic_vs_idealistic: { positions: [], weights: [] },
  };

  for (const decision of decisions) {
    for (const cls of decision.classifications) {
      if (cls.confidence < MIN_CONFIDENCE_THRESHOLD) continue;
      if (cls.acceptedPosition === null) continue;

      // The accepted position tells us what the user chose on this axis.
      // Weight by confidence and recency.
      axisAccumulator[cls.axis].positions.push(cls.acceptedPosition);
      axisAccumulator[cls.axis].weights.push(cls.confidence);
    }
  }

  const vector: PreferenceVector = {
    quick_win_vs_comprehensive: 0.5,
    build_vs_buy: 0.5,
    incremental_vs_architectural: 0.5,
    pragmatic_vs_idealistic: 0.5,
  };

  const axisCounts: Record<ArchetypeAxis, number> = {
    quick_win_vs_comprehensive: 0,
    build_vs_buy: 0,
    incremental_vs_architectural: 0,
    pragmatic_vs_idealistic: 0,
  };

  let totalStability = 0;
  let axesWithData = 0;

  for (const axis of Object.keys(axisAccumulator) as ArchetypeAxis[]) {
    const { positions, weights } = axisAccumulator[axis];
    axisCounts[axis] = positions.length;

    if (positions.length < 2) continue; // Need at least 2 data points

    // Weighted average
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const weightedSum = positions.reduce((sum, pos, i) => sum + pos * weights[i], 0);
    vector[axis] = Math.round((weightedSum / totalWeight) * 100) / 100;

    // Stability = 1 - standard deviation (low variance = high stability)
    const mean = weightedSum / totalWeight;
    const variance = positions.reduce((sum, pos, i) =>
      sum + weights[i] * (pos - mean) ** 2, 0) / totalWeight;
    const stdDev = Math.sqrt(variance);
    totalStability += Math.max(0, 1 - stdDev * 2); // stdDev of 0.5 = 0 stability
    axesWithData++;
  }

  const stability = axesWithData > 0
    ? Math.round((totalStability / axesWithData) * 100) / 100
    : 0;

  return { vector, axisCounts, stability };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute the full preference profile for a project.
 * This is the main entry point.
 */
export function computePreferenceProfile(projectId: string): PreferenceProfile {
  const decisions = loadPairDecisions(projectId);
  const { vector, axisCounts, stability } = computePreferenceVector(decisions);

  return {
    projectId,
    vector,
    sampleCount: decisions.length,
    axisCounts,
    stability,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Format the preference profile as a prompt section for direction generation.
 * Returns empty string if not enough data to be meaningful.
 */
export function formatPreferenceForPrompt(profile: PreferenceProfile): string {
  if (profile.sampleCount < 3) {
    return ''; // Not enough pair decisions to establish preferences
  }

  const lines: string[] = [];
  const { vector, axisCounts, sampleCount, stability } = profile;

  // Only include axes with meaningful signal (at least 2 data points + deviation from neutral)
  const deviationThreshold = 0.12; // Must be at least 12% away from neutral (0.5)

  const insights: string[] = [];

  if (axisCounts.quick_win_vs_comprehensive >= 2) {
    const v = vector.quick_win_vs_comprehensive;
    if (Math.abs(v - 0.5) > deviationThreshold) {
      if (v < 0.5) {
        const pct = Math.round((1 - v) * 100);
        insights.push(`- **Speed over thoroughness** (${pct}%): This user tends to prefer quick-win, focused solutions over comprehensive approaches. **Weight Variant A toward lean, targeted implementations** — but offer a thorough alternative in Variant B.`);
      } else {
        const pct = Math.round(v * 100);
        insights.push(`- **Thoroughness over speed** (${pct}%): This user tends to prefer comprehensive, robust solutions over quick fixes. **Weight Variant A toward production-grade, thorough implementations** — but offer a leaner alternative in Variant B.`);
      }
    }
  }

  if (axisCounts.build_vs_buy >= 2) {
    const v = vector.build_vs_buy;
    if (Math.abs(v - 0.5) > deviationThreshold) {
      if (v < 0.5) {
        const pct = Math.round((1 - v) * 100);
        insights.push(`- **Build over buy** (${pct}%): This user prefers custom-built solutions over third-party libraries. **Weight Variant A toward custom implementations** — but offer a library-based alternative in Variant B.`);
      } else {
        const pct = Math.round(v * 100);
        insights.push(`- **Leverage existing tools** (${pct}%): This user prefers using established libraries and frameworks. **Weight Variant A toward existing packages and integrations** — but offer a custom-built alternative in Variant B.`);
      }
    }
  }

  if (axisCounts.incremental_vs_architectural >= 2) {
    const v = vector.incremental_vs_architectural;
    if (Math.abs(v - 0.5) > deviationThreshold) {
      if (v < 0.5) {
        const pct = Math.round((1 - v) * 100);
        insights.push(`- **Incremental over architectural** (${pct}%): This user prefers targeted improvements over structural overhauls. **Weight Variant A toward iterative enhancements** — but offer an architectural alternative in Variant B.`);
      } else {
        const pct = Math.round(v * 100);
        insights.push(`- **Architectural over incremental** (${pct}%): This user is willing to invest in structural rewrites for better foundations. **Weight Variant A toward clean architectural solutions** — but offer a more incremental alternative in Variant B.`);
      }
    }
  }

  if (axisCounts.pragmatic_vs_idealistic >= 2) {
    const v = vector.pragmatic_vs_idealistic;
    if (Math.abs(v - 0.5) > deviationThreshold) {
      if (v < 0.5) {
        const pct = Math.round((1 - v) * 100);
        insights.push(`- **Pragmatic over principled** (${pct}%): This user values shipping working code over perfect patterns. **Weight Variant A toward practical, working solutions** — but offer a more principled alternative in Variant B.`);
      } else {
        const pct = Math.round(v * 100);
        insights.push(`- **Principled over pragmatic** (${pct}%): This user values clean patterns and best practices. **Weight Variant A toward elegant, type-safe, idiomatic solutions** — but offer a more pragmatic alternative in Variant B.`);
      }
    }
  }

  if (insights.length === 0) {
    return ''; // No strong preferences detected
  }

  lines.push(`## User Engineering Preferences`);
  lines.push('');
  lines.push(`Based on ${sampleCount} historical pair decisions (stability: ${Math.round(stability * 100)}%), this user has demonstrated the following approach preferences:`);
  lines.push('');
  lines.push(...insights);
  lines.push('');
  lines.push(`**Important**: Variant A should align with the user's demonstrated preferences to make it immediately compelling. Variant B should offer a genuinely different approach — the style the user doesn't usually pick — with a strong case for when it's the better choice. The goal is calibrated pairs, not echo chambers.`);
  lines.push('');

  return lines.join('\n');
}
