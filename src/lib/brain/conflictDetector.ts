/**
 * Brain Conflict Detector for Triage
 *
 * Detects conflicts between backlog items and high-confidence Brain insights.
 * Uses keyword matching against warning and pattern_detected insights
 * from getBehavioralContext().topInsights.
 */

import { getBehavioralContext } from './behavioralContext';

export interface ConflictResult {
  hasConflict: boolean;
  reason: string | null;
  patternTitle: string | null;
}

/**
 * Detect Brain conflicts for a set of triage items.
 *
 * Algorithm:
 * 1. Get topInsights from behavioral context (already filtered to >=80% confidence)
 * 2. Filter to 'warning' and 'pattern_detected' types
 * 3. For each item, compare title+description against insight description keywords (>4 chars)
 * 4. Flag if 2+ keyword matches
 *
 * @returns Map of item ID to ConflictResult
 */
export function detectBrainConflicts(
  items: Array<{ id: string; title: string; description?: string; category: string }>,
  projectId: string
): Map<string, ConflictResult> {
  const results = new Map<string, ConflictResult>();
  const ctx = getBehavioralContext(projectId);

  if (!ctx.hasData || ctx.topInsights.length === 0) {
    // No insights -- no conflicts possible
    for (const item of items) {
      results.set(item.id, { hasConflict: false, reason: null, patternTitle: null });
    }
    return results;
  }

  // Filter to warning/pattern_detected insights (most likely to conflict)
  const warningInsights = ctx.topInsights.filter(
    i => i.type === 'warning' || i.type === 'pattern_detected'
  );

  for (const item of items) {
    const itemText = `${item.title} ${item.description || ''}`.toLowerCase();
    let conflict: ConflictResult = { hasConflict: false, reason: null, patternTitle: null };

    for (const insight of warningInsights) {
      // Simple keyword matching for v1
      const insightKeywords = insight.description.toLowerCase().split(/\s+/);
      const significantKeywords = insightKeywords.filter(w => w.length > 4);
      const matchCount = significantKeywords.filter(kw => itemText.includes(kw)).length;

      if (matchCount >= 2) {
        conflict = {
          hasConflict: true,
          reason: insight.description,
          patternTitle: insight.title,
        };
        break;
      }
    }

    results.set(item.id, conflict);
  }

  return results;
}
