/**
 * Feedback Synthesis Engine
 * Aggregates idea rejection/acceptance patterns and generates
 * lessons-learned sections for injection into scan prompts.
 */

import { getDatabase } from '@/app/db/connection';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CategoryStats {
  category: string;
  total: number;
  accepted: number;
  rejected: number;
  acceptRate: number;
  /** Top rejection reasons with counts */
  topRejectionReasons: Array<{ reason: string; count: number }>;
}

export interface ScanTypeStats {
  scanType: string;
  total: number;
  accepted: number;
  rejected: number;
  acceptRate: number;
}

export interface RecentAcceptedIdea {
  title: string;
  category: string;
  effort: number | null;
  impact: number | null;
}

export interface FeedbackSynthesis {
  /** Stats per category (e.g., 'ui' ideas rejected 80% as 'too_complex') */
  categoryStats: CategoryStats[];
  /** Stats per scan type */
  scanTypeStats: ScanTypeStats[];
  /** Last N accepted ideas */
  recentAccepted: RecentAcceptedIdea[];
  /** Overall accept rate */
  overallAcceptRate: number;
  /** Total ideas processed */
  totalProcessed: number;
  /** Most preferred categories (highest accept rate with min 3 decisions) */
  preferredCategories: string[];
  /** Most rejected categories */
  avoidCategories: string[];
}

// ── Core Engine ──────────────────────────────────────────────────────────────

/**
 * Aggregate feedback data for a project (optionally filtered by context)
 */
export function synthesizeFeedback(
  projectId: string,
  contextId?: string
): FeedbackSynthesis {
  const db = getDatabase();

  const contextFilter = contextId
    ? 'AND context_id = ?'
    : '';
  const params = contextId
    ? [projectId, contextId]
    : [projectId];

  // Category stats
  const categoryRows = db.prepare(`
    SELECT
      category,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM ideas
    WHERE project_id = ? ${contextFilter}
      AND status IN ('accepted', 'rejected')
    GROUP BY category
    ORDER BY total DESC
  `).all(...params) as Array<{ category: string; total: number; accepted: number; rejected: number }>;

  // Rejection reasons per category (stored in user_feedback)
  const reasonRows = db.prepare(`
    SELECT category, user_feedback as reason, COUNT(*) as count
    FROM ideas
    WHERE project_id = ? ${contextFilter}
      AND status = 'rejected'
      AND user_feedback IS NOT NULL
      AND user_feedback != ''
    GROUP BY category, user_feedback
    ORDER BY count DESC
  `).all(...params) as Array<{ category: string; reason: string; count: number }>;

  // Group reasons by category
  const reasonsByCategory = new Map<string, Array<{ reason: string; count: number }>>();
  for (const row of reasonRows) {
    if (!reasonsByCategory.has(row.category)) {
      reasonsByCategory.set(row.category, []);
    }
    reasonsByCategory.get(row.category)!.push({ reason: row.reason, count: row.count });
  }

  const categoryStats: CategoryStats[] = categoryRows.map(row => ({
    category: row.category,
    total: row.total,
    accepted: row.accepted,
    rejected: row.rejected,
    acceptRate: row.total > 0 ? Math.round((row.accepted / row.total) * 100) : 0,
    topRejectionReasons: (reasonsByCategory.get(row.category) || []).slice(0, 3),
  }));

  // Scan type stats
  const scanTypeRows = db.prepare(`
    SELECT
      scan_type,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM ideas
    WHERE project_id = ? ${contextFilter}
      AND status IN ('accepted', 'rejected')
    GROUP BY scan_type
    ORDER BY total DESC
  `).all(...params) as Array<{ scan_type: string; total: number; accepted: number; rejected: number }>;

  const scanTypeStats: ScanTypeStats[] = scanTypeRows.map(row => ({
    scanType: row.scan_type,
    total: row.total,
    accepted: row.accepted,
    rejected: row.rejected,
    acceptRate: row.total > 0 ? Math.round((row.accepted / row.total) * 100) : 0,
  }));

  // Recent accepted ideas
  const recentAccepted = db.prepare(`
    SELECT title, category, effort, impact
    FROM ideas
    WHERE project_id = ? ${contextFilter}
      AND status = 'accepted'
    ORDER BY updated_at DESC
    LIMIT 5
  `).all(...params) as RecentAcceptedIdea[];

  // Overall stats
  const overallRow = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted
    FROM ideas
    WHERE project_id = ? ${contextFilter}
      AND status IN ('accepted', 'rejected')
  `).get(...params) as { total: number; accepted: number };

  const overallAcceptRate = overallRow.total > 0
    ? Math.round((overallRow.accepted / overallRow.total) * 100)
    : 0;

  // Preferred and avoid categories (min 3 decisions)
  const minDecisions = 3;
  const significantCategories = categoryStats.filter(c => c.total >= minDecisions);
  const preferredCategories = significantCategories
    .filter(c => c.acceptRate >= 60)
    .sort((a, b) => b.acceptRate - a.acceptRate)
    .map(c => c.category);
  const avoidCategories = significantCategories
    .filter(c => c.acceptRate <= 30)
    .sort((a, b) => a.acceptRate - b.acceptRate)
    .map(c => c.category);

  return {
    categoryStats,
    scanTypeStats,
    recentAccepted,
    overallAcceptRate,
    totalProcessed: overallRow.total,
    preferredCategories,
    avoidCategories,
  };
}

// ── Prompt Section Builder ───────────────────────────────────────────────────

/**
 * Build a "Lessons Learned" section for injection into scan prompts.
 * Returns empty string if insufficient data (< 5 decisions).
 */
export function buildFeedbackSection(
  projectId: string,
  contextId?: string,
  scanType?: string
): string {
  try {
    const synthesis = synthesizeFeedback(projectId, contextId);

    // Require minimum data to be useful
    if (synthesis.totalProcessed < 5) return '';

    const lines: string[] = [];
    lines.push('## Lessons Learned (From User Decisions)');
    lines.push('');
    lines.push(`Based on ${synthesis.totalProcessed} idea decisions (${synthesis.overallAcceptRate}% acceptance rate):`);
    lines.push('');

    // Category preferences
    if (synthesis.preferredCategories.length > 0) {
      lines.push(`**Preferred categories**: ${synthesis.preferredCategories.join(', ')}`);
    }
    if (synthesis.avoidCategories.length > 0) {
      lines.push(`**Low-acceptance categories**: ${synthesis.avoidCategories.join(', ')} — consider fewer ideas in these areas or adjust scope/complexity`);
    }
    lines.push('');

    // Category-specific rejection patterns
    const categoriesWithReasons = synthesis.categoryStats.filter(c => c.topRejectionReasons.length > 0);
    if (categoriesWithReasons.length > 0) {
      lines.push('**Rejection patterns by category**:');
      for (const cat of categoriesWithReasons.slice(0, 5)) {
        const reasons = cat.topRejectionReasons.map(r => `${r.reason} (${r.count}x)`).join(', ');
        lines.push(`- **${cat.category}** (${cat.acceptRate}% accepted): common rejections — ${reasons}`);
      }
      lines.push('');
    }

    // Scan type effectiveness (only if current scan type has data)
    if (scanType) {
      const currentScanStats = synthesis.scanTypeStats.find(s => s.scanType === scanType);
      if (currentScanStats && currentScanStats.total >= 3) {
        lines.push(`**This agent (${scanType})**: ${currentScanStats.acceptRate}% acceptance rate from ${currentScanStats.total} ideas`);
        if (currentScanStats.acceptRate < 40) {
          lines.push('  → Low acceptance — focus on higher-impact, more practical ideas');
        } else if (currentScanStats.acceptRate > 70) {
          lines.push('  → High acceptance — the user values ideas from this perspective, be bold');
        }
        lines.push('');
      }
    }

    // Recent accepted ideas for calibration
    if (synthesis.recentAccepted.length > 0) {
      lines.push('**Recently accepted ideas** (calibrate style and scope):');
      for (const idea of synthesis.recentAccepted) {
        const scores = [];
        if (idea.effort !== null) scores.push(`effort:${idea.effort}`);
        if (idea.impact !== null) scores.push(`impact:${idea.impact}`);
        const scoreStr = scores.length > 0 ? ` [${scores.join(', ')}]` : '';
        lines.push(`- "${idea.title}" (${idea.category})${scoreStr}`);
      }
      lines.push('');
    }

    lines.push('**Apply these insights**: Generate ideas that align with the user\'s demonstrated preferences. Avoid patterns that have been consistently rejected.');
    lines.push('');

    return lines.join('\n');
  } catch {
    return ''; // Never break prompt building
  }
}
