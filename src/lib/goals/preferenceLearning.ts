/**
 * Preference Learning Module
 *
 * Analyzes historical goal candidate actions (accept/reject/tweak) to build
 * a preference profile that improves future candidate generation.
 *
 * - Classifies rejection reasons into systematic categories
 * - Identifies patterns in accepted goals (themes, priority ranges, language)
 * - Detects tweak patterns to understand what adjustments users commonly make
 * - Builds a structured feedback prompt section for the LLM generator
 */

import { goalCandidateRepository } from '@/app/db/repositories/goal-candidate.repository';

// ── Rejection Categories ──

export type RejectionCategory =
  | 'too_tactical'       // Goal is too small / task-level
  | 'too_vague'          // Goal lacks specificity or clarity
  | 'wrong_scope'        // Goal doesn't match project direction
  | 'already_addressed'  // Goal duplicates existing work or goals
  | 'low_priority'       // Goal isn't important enough right now
  | 'misaligned_theme'   // Goal targets the wrong strategic theme
  | 'too_ambitious'      // Goal is unrealistically large
  | 'other';             // Doesn't fit known categories

const REJECTION_PATTERNS: Array<{ category: RejectionCategory; patterns: RegExp[] }> = [
  {
    category: 'too_tactical',
    patterns: [
      /too (small|simple|specific|narrow|tactical|granular)/i,
      /just a (task|fix|tweak|ticket)/i,
      /not (strategic|big) enough/i,
      /backlog item/i,
      /implementation detail/i,
    ],
  },
  {
    category: 'too_vague',
    patterns: [
      /too (vague|abstract|broad|generic|high[- ]level)/i,
      /not (specific|clear|concrete|actionable) enough/i,
      /unclear|ambiguous/i,
      /what does (this|that) mean/i,
      /need(s)? more (detail|specifics|clarity)/i,
    ],
  },
  {
    category: 'wrong_scope',
    patterns: [
      /wrong (scope|direction|area|focus)/i,
      /not (relevant|related|applicable)/i,
      /out of scope/i,
      /doesn'?t (fit|match|align) (with )?(the |our )?(project|direction|roadmap)/i,
      /we('re| are) not (doing|working on|focused on)/i,
    ],
  },
  {
    category: 'already_addressed',
    patterns: [
      /already (done|addressed|exists?|covered|working on|have|built)/i,
      /duplicate/i,
      /we (already|have already)/i,
      /redundant/i,
      /same as/i,
    ],
  },
  {
    category: 'low_priority',
    patterns: [
      /low priority/i,
      /not (important|urgent|critical) (enough|right now|now)/i,
      /nice to have/i,
      /maybe later/i,
      /not now/i,
      /deprioritiz/i,
    ],
  },
  {
    category: 'misaligned_theme',
    patterns: [
      /wrong (theme|category|type)/i,
      /should be (about|focused on|targeting)/i,
      /misaligned/i,
      /we (need|want) (more )?(security|performance|ux|reliability)/i,
    ],
  },
  {
    category: 'too_ambitious',
    patterns: [
      /too (big|ambitious|complex|large|broad)/i,
      /unrealistic/i,
      /break.*(down|up|into)/i,
      /scope (creep|too large)/i,
    ],
  },
];

/**
 * Classify a rejection reason into a known category using pattern matching.
 */
export function classifyRejectionReason(reason: string): RejectionCategory {
  if (!reason || reason.trim().length === 0) return 'other';

  for (const { category, patterns } of REJECTION_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(reason)) {
        return category;
      }
    }
  }

  return 'other';
}

// ── Preference Profile ──

export interface PreferenceProfile {
  totalDecisions: number;
  acceptRate: number;
  rejectRate: number;
  tweakRate: number;

  // Rejection breakdown by classified category
  rejectionBreakdown: Record<RejectionCategory, number>;
  topRejectionCategories: Array<{ category: RejectionCategory; count: number; percentage: number }>;

  // Accepted goal patterns
  acceptedThemes: Record<string, number>;       // strategic theme → count
  acceptedPriorityRange: { min: number; max: number; avg: number };

  // Tweak patterns — what users commonly change
  tweakPatterns: string[];

  // High-signal observations for the LLM
  observations: string[];
}

/**
 * Analyze full action history to build a preference profile for a project.
 */
export function analyzePreferenceHistory(projectId: string): PreferenceProfile | null {
  const history = goalCandidateRepository.getActionHistory(projectId);

  if (history.length === 0) return null;

  const accepted = history.filter(h => h.user_action === 'accepted');
  const rejected = history.filter(h => h.user_action === 'rejected');
  const tweaked = history.filter(h => h.user_action === 'tweaked');
  const total = history.length;

  // --- Rejection classification ---
  const rejectionBreakdown: Record<RejectionCategory, number> = {
    too_tactical: 0,
    too_vague: 0,
    wrong_scope: 0,
    already_addressed: 0,
    low_priority: 0,
    misaligned_theme: 0,
    too_ambitious: 0,
    other: 0,
  };

  for (const r of rejected) {
    if (r.rejection_reason) {
      const category = classifyRejectionReason(r.rejection_reason);
      rejectionBreakdown[category]++;
    }
  }

  const topRejectionCategories = Object.entries(rejectionBreakdown)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([category, count]) => ({
      category: category as RejectionCategory,
      count,
      percentage: rejected.length > 0 ? Math.round((count / rejected.length) * 100) : 0,
    }));

  // --- Accepted goal themes ---
  const acceptedThemes: Record<string, number> = {};
  const acceptedScores: number[] = [];

  for (const a of accepted) {
    acceptedScores.push(a.priority_score);

    if (a.source_metadata) {
      try {
        const meta = JSON.parse(a.source_metadata);
        if (meta.strategicTheme) {
          acceptedThemes[meta.strategicTheme] = (acceptedThemes[meta.strategicTheme] || 0) + 1;
        }
      } catch {
        // skip malformed metadata
      }
    }
  }

  const acceptedPriorityRange = acceptedScores.length > 0
    ? {
        min: Math.min(...acceptedScores),
        max: Math.max(...acceptedScores),
        avg: Math.round(acceptedScores.reduce((s, v) => s + v, 0) / acceptedScores.length),
      }
    : { min: 0, max: 100, avg: 50 };

  // --- Tweak patterns ---
  const tweakPatterns: string[] = [];
  if (tweaked.length > 0) {
    // Tweaked candidates indicate the LLM was close but needed adjustment
    // We note general patterns from the tweaked set
    const tweakedWithDescriptions = tweaked.filter(t => t.description);
    if (tweakedWithDescriptions.length > 0) {
      tweakPatterns.push(`${tweaked.length} candidates were tweaked before acceptance`);
    }
  }

  // --- Derive observations ---
  const observations = deriveObservations({
    total,
    accepted: accepted.length,
    rejected: rejected.length,
    tweaked: tweaked.length,
    topRejectionCategories,
    acceptedThemes,
    acceptedPriorityRange,
  });

  return {
    totalDecisions: total,
    acceptRate: Math.round((accepted.length / total) * 100),
    rejectRate: Math.round((rejected.length / total) * 100),
    tweakRate: Math.round((tweaked.length / total) * 100),
    rejectionBreakdown,
    topRejectionCategories,
    acceptedThemes,
    acceptedPriorityRange,
    tweakPatterns,
    observations,
  };
}

/**
 * Derive human-readable observations from the preference profile data.
 * These get injected directly into the LLM prompt.
 */
function deriveObservations(data: {
  total: number;
  accepted: number;
  rejected: number;
  tweaked: number;
  topRejectionCategories: Array<{ category: RejectionCategory; count: number; percentage: number }>;
  acceptedThemes: Record<string, number>;
  acceptedPriorityRange: { min: number; max: number; avg: number };
}): string[] {
  const obs: string[] = [];
  const { total, accepted, rejected, tweaked, topRejectionCategories, acceptedThemes, acceptedPriorityRange } = data;

  // Accept rate insight
  const acceptRate = Math.round((accepted / total) * 100);
  if (acceptRate < 30) {
    obs.push(`Low accept rate (${acceptRate}%) — the user is highly selective. Generate fewer, higher-quality candidates.`);
  } else if (acceptRate > 70) {
    obs.push(`High accept rate (${acceptRate}%) — generation quality is well-calibrated.`);
  }

  // Dominant rejection reasons
  if (topRejectionCategories.length > 0) {
    const top = topRejectionCategories[0];
    if (top.percentage >= 40) {
      const guidance = CATEGORY_GUIDANCE[top.category];
      obs.push(`Dominant rejection pattern: "${top.category}" (${top.percentage}% of rejections). ${guidance}`);
    }
  }

  // Preferred themes
  const sortedThemes = Object.entries(acceptedThemes).sort(([, a], [, b]) => b - a);
  if (sortedThemes.length > 0) {
    const preferredThemes = sortedThemes.slice(0, 3).map(([theme]) => theme);
    obs.push(`User prefers these strategic themes: ${preferredThemes.join(', ')}.`);
  }

  // Priority range insight
  if (accepted >= 3) {
    obs.push(`Accepted goals typically have priority scores between ${acceptedPriorityRange.min}-${acceptedPriorityRange.max} (avg: ${acceptedPriorityRange.avg}).`);
  }

  // Tweak rate insight
  if (tweaked > 0) {
    const tweakRate = Math.round((tweaked / total) * 100);
    if (tweakRate > 20) {
      obs.push(`${tweakRate}% of candidates need tweaking — aim for more precise titles and descriptions.`);
    }
  }

  return obs;
}

/** Actionable guidance per rejection category for the LLM. */
const CATEGORY_GUIDANCE: Record<RejectionCategory, string> = {
  too_tactical: 'Generate higher-level, more strategic goals. Avoid task-level items.',
  too_vague: 'Be more specific and concrete. Describe measurable end states.',
  wrong_scope: 'Focus on areas the project is actively working on. Review the repository data carefully.',
  already_addressed: 'Check existing goals and recent work before suggesting. Avoid duplicates.',
  low_priority: 'Focus on higher-impact, more urgent goals. Raise the priority bar.',
  misaligned_theme: 'Pay close attention to which themes the user has previously accepted.',
  too_ambitious: 'Break down into achievable goals. Target 2-4 week horizons, not quarter-long epics.',
  other: 'Review the specific rejection reasons carefully and avoid similar patterns.',
};

// ── Prompt Builder ──

/**
 * Build a comprehensive preference feedback section for the LLM generation prompt.
 * Replaces the simple rejection-only feedback with a full preference profile.
 */
export function buildPreferenceFeedback(projectId: string): string {
  const profile = analyzePreferenceHistory(projectId);
  if (!profile || profile.totalDecisions < 3) {
    // Not enough history — fall back to simple rejection feedback
    return buildSimpleRejectionFeedback(projectId);
  }

  const parts: string[] = [];

  parts.push(`## User Preference Profile (${profile.totalDecisions} decisions analyzed)`);
  parts.push(`- Accept rate: ${profile.acceptRate}% | Reject rate: ${profile.rejectRate}% | Tweak rate: ${profile.tweakRate}%`);

  // Accepted patterns
  if (Object.keys(profile.acceptedThemes).length > 0) {
    parts.push('\n### What the user values');
    const themeLines = Object.entries(profile.acceptedThemes)
      .sort(([, a], [, b]) => b - a)
      .map(([theme, count]) => `- ${theme}: ${count} accepted`);
    parts.push(themeLines.join('\n'));
    parts.push(`- Preferred priority range: ${profile.acceptedPriorityRange.min}-${profile.acceptedPriorityRange.max} (avg ${profile.acceptedPriorityRange.avg})`);
  }

  // Rejection patterns
  if (profile.topRejectionCategories.length > 0) {
    parts.push('\n### Systematic rejection patterns');
    for (const { category, count, percentage } of profile.topRejectionCategories) {
      parts.push(`- ${category}: ${count} rejections (${percentage}%) — ${CATEGORY_GUIDANCE[category]}`);
    }
  }

  // Recent specific rejections (keep for concrete examples)
  const recentRejections = goalCandidateRepository.getRejectedCandidatesWithReasons(projectId, 10);
  if (recentRejections.length > 0) {
    parts.push('\n### Recent specific rejections (do NOT suggest similar goals)');
    for (const r of recentRejections) {
      parts.push(`- "${r.title}": ${r.rejection_reason}`);
    }
  }

  // Recent accepted goals (positive examples)
  const recentAccepted = goalCandidateRepository.getAcceptedCandidates(projectId, 5);
  if (recentAccepted.length > 0) {
    parts.push('\n### Recently accepted goals (generate MORE like these)');
    for (const a of recentAccepted) {
      parts.push(`- "${a.title}": ${a.description?.substring(0, 120) || 'No description'}`);
    }
  }

  // Key observations
  if (profile.observations.length > 0) {
    parts.push('\n### Key insights for this generation');
    for (const obs of profile.observations) {
      parts.push(`⚠️ ${obs}`);
    }
  }

  return parts.join('\n');
}

/**
 * Fallback: simple rejection-only feedback when not enough history exists.
 */
function buildSimpleRejectionFeedback(projectId: string): string {
  const rejected = goalCandidateRepository.getRejectedCandidatesWithReasons(projectId);
  if (rejected.length === 0) return '';

  const lines = rejected.map(r => `- "${r.title}": ${r.rejection_reason}`);
  return `Previously Rejected Candidates:\n${lines.join('\n')}`;
}

/**
 * Compute temperature adjustment based on preference history.
 * Lower temperature when accept rate is high (calibrated well),
 * keep higher temperature when accept rate is low (needs more exploration).
 */
export function computeTemperatureAdjustment(projectId: string): number {
  const profile = analyzePreferenceHistory(projectId);
  if (!profile || profile.totalDecisions < 5) return 0.7; // default

  if (profile.acceptRate > 70) return 0.5;  // well-calibrated, be more focused
  if (profile.acceptRate < 25) return 0.85; // poorly calibrated, explore more
  return 0.7; // default range
}

/**
 * Suggest max candidates based on preference history.
 * Generate fewer candidates when accept rate is high (user likes what we produce).
 * Generate more when accept rate is low (need more options).
 */
export function suggestMaxCandidates(projectId: string, requestedMax: number): number {
  const profile = analyzePreferenceHistory(projectId);
  if (!profile || profile.totalDecisions < 5) return requestedMax;

  if (profile.acceptRate > 70) return Math.max(2, Math.min(requestedMax, 3)); // fewer, better
  if (profile.acceptRate < 25) return Math.min(requestedMax + 2, 8); // more variety
  return requestedMax;
}
