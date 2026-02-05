/**
 * Insight Conflict Detector
 * Detects conflicting insights similar to Git merge conflicts
 * Uses keyword matching and semantic similarity to identify contradictions
 */

import type { LearningInsight } from '@/app/db/models/brain.types';

// Opposing keyword pairs that indicate potential conflicts
const OPPOSING_KEYWORDS: Array<[string[], string[]]> = [
  // Size/Length preferences
  [['shorter', 'small', 'brief', 'concise', 'minimal', 'compact'], ['longer', 'large', 'verbose', 'detailed', 'extensive', 'comprehensive']],
  // Separation vs consolidation
  [['separate', 'split', 'modular', 'decompose', 'isolate'], ['combine', 'merge', 'consolidate', 'unified', 'together', 'single']],
  // Abstraction levels
  [['abstract', 'generic', 'reusable', 'flexible'], ['concrete', 'specific', 'hardcoded', 'explicit']],
  // Code style
  [['inline', 'direct'], ['extract', 'refactor', 'externalize']],
  // Error handling
  [['strict', 'throw', 'fail-fast', 'error'], ['lenient', 'graceful', 'fallback', 'default']],
  // Performance vs readability
  [['optimize', 'performance', 'efficient', 'fast'], ['readable', 'clear', 'simple', 'maintainable']],
  // DRY vs explicit
  [['DRY', 'reuse', 'shared', 'common'], ['explicit', 'duplicate', 'copy', 'repeat']],
  // Testing approaches
  [['unit', 'isolated', 'mock'], ['integration', 'e2e', 'real']],
  // Early vs lazy
  [['eager', 'early', 'upfront', 'preload'], ['lazy', 'deferred', 'on-demand', 'late']],
];

// Common negation patterns
const NEGATION_PATTERNS = ['avoid', 'don\'t', 'never', 'no ', 'not ', 'without', 'prevent'];

export interface ConflictResult {
  insight1Title: string;
  insight2Title: string;
  conflictType: 'semantic' | 'keyword' | 'direct';
  confidence: number; // 0-100
  reason: string;
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Check if text contains any keywords from a set
 */
function containsKeywords(text: string, keywords: string[]): boolean {
  const normalized = normalizeText(text);
  return keywords.some(kw => normalized.includes(kw.toLowerCase()));
}

/**
 * Check if text contains negation before a keyword
 */
function hasNegatedKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalizeText(text);
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    const idx = normalized.indexOf(kwLower);
    if (idx > 0) {
      const prefix = normalized.slice(Math.max(0, idx - 20), idx);
      if (NEGATION_PATTERNS.some(neg => prefix.includes(neg))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculate simple word overlap similarity (Jaccard-like)
 */
function calculateWordSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeText(text1).split(' ').filter(w => w.length > 3));
  const words2 = new Set(normalizeText(text2).split(' ').filter(w => w.length > 3));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }

  const union = words1.size + words2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Detect keyword-based conflicts between two insights
 */
function detectKeywordConflict(
  insight1: LearningInsight,
  insight2: LearningInsight
): ConflictResult | null {
  const text1 = `${insight1.title} ${insight1.description}`;
  const text2 = `${insight2.title} ${insight2.description}`;

  for (const [group1, group2] of OPPOSING_KEYWORDS) {
    // Check if insight1 matches group1 and insight2 matches group2
    const match1to1 = containsKeywords(text1, group1) && !hasNegatedKeyword(text1, group1);
    const match2to2 = containsKeywords(text2, group2) && !hasNegatedKeyword(text2, group2);

    if (match1to1 && match2to2) {
      return {
        insight1Title: insight1.title,
        insight2Title: insight2.title,
        conflictType: 'keyword',
        confidence: 70,
        reason: `Opposing preferences: "${group1[0]}" vs "${group2[0]}"`,
      };
    }

    // Check reverse
    const match1to2 = containsKeywords(text1, group2) && !hasNegatedKeyword(text1, group2);
    const match2to1 = containsKeywords(text2, group1) && !hasNegatedKeyword(text2, group1);

    if (match1to2 && match2to1) {
      return {
        insight1Title: insight1.title,
        insight2Title: insight2.title,
        conflictType: 'keyword',
        confidence: 70,
        reason: `Opposing preferences: "${group2[0]}" vs "${group1[0]}"`,
      };
    }

    // Check if same topic but one is negated
    if ((match1to1 && hasNegatedKeyword(text2, group1)) ||
        (match2to2 && hasNegatedKeyword(text1, group2))) {
      return {
        insight1Title: insight1.title,
        insight2Title: insight2.title,
        conflictType: 'direct',
        confidence: 85,
        reason: `Direct contradiction detected via negation`,
      };
    }
  }

  return null;
}

/**
 * Detect semantic conflicts (similar topic, different stance)
 */
function detectSemanticConflict(
  insight1: LearningInsight,
  insight2: LearningInsight
): ConflictResult | null {
  const text1 = `${insight1.title} ${insight1.description}`;
  const text2 = `${insight2.title} ${insight2.description}`;

  // High similarity but different type suggests potential conflict
  const similarity = calculateWordSimilarity(text1, text2);

  if (similarity > 0.4) {
    // Check for negation differences
    const hasNeg1 = NEGATION_PATTERNS.some(neg => normalizeText(text1).includes(neg));
    const hasNeg2 = NEGATION_PATTERNS.some(neg => normalizeText(text2).includes(neg));

    if (hasNeg1 !== hasNeg2) {
      return {
        insight1Title: insight1.title,
        insight2Title: insight2.title,
        conflictType: 'semantic',
        confidence: Math.round(similarity * 100),
        reason: `Similar topic with opposing stance (${Math.round(similarity * 100)}% overlap)`,
      };
    }

    // Different insight types on same topic can conflict
    if (insight1.type !== insight2.type && similarity > 0.5) {
      // Warning vs recommendation on same topic is a conflict
      if ((insight1.type === 'warning' && insight2.type === 'recommendation') ||
          (insight1.type === 'recommendation' && insight2.type === 'warning')) {
        return {
          insight1Title: insight1.title,
          insight2Title: insight2.title,
          conflictType: 'semantic',
          confidence: Math.round(similarity * 80),
          reason: `Warning conflicts with recommendation on same topic`,
        };
      }
    }
  }

  return null;
}

/**
 * Detect all conflicts between a new insight and existing insights
 */
export function detectConflicts(
  newInsight: LearningInsight,
  existingInsights: LearningInsight[],
  minConfidence: number = 60
): ConflictResult[] {
  const conflicts: ConflictResult[] = [];

  for (const existing of existingInsights) {
    // Skip if comparing to itself
    if (existing.title === newInsight.title) continue;

    // Skip if conflict already resolved
    if (existing.conflict_resolved) continue;

    // Try keyword-based detection first
    const keywordConflict = detectKeywordConflict(newInsight, existing);
    if (keywordConflict && keywordConflict.confidence >= minConfidence) {
      conflicts.push(keywordConflict);
      continue;
    }

    // Then try semantic detection
    const semanticConflict = detectSemanticConflict(newInsight, existing);
    if (semanticConflict && semanticConflict.confidence >= minConfidence) {
      conflicts.push(semanticConflict);
    }
  }

  return conflicts;
}

/**
 * Detect all conflicts within a set of insights
 */
export function detectAllConflicts(
  insights: LearningInsight[],
  minConfidence: number = 60
): ConflictResult[] {
  const conflicts: ConflictResult[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < insights.length; i++) {
    for (let j = i + 1; j < insights.length; j++) {
      const pairKey = [insights[i].title, insights[j].title].sort().join('|||');
      if (seen.has(pairKey)) continue;

      const conflict = detectKeywordConflict(insights[i], insights[j])
        || detectSemanticConflict(insights[i], insights[j]);

      if (conflict && conflict.confidence >= minConfidence) {
        conflicts.push(conflict);
        seen.add(pairKey);
      }
    }
  }

  return conflicts;
}

/**
 * Mark conflicts on insights array (mutates the array)
 */
export function markConflictsOnInsights(
  insights: LearningInsight[],
  minConfidence: number = 60
): number {
  const conflicts = detectAllConflicts(insights, minConfidence);
  let markedCount = 0;

  for (const conflict of conflicts) {
    const insight1 = insights.find(i => i.title === conflict.insight1Title);
    const insight2 = insights.find(i => i.title === conflict.insight2Title);

    if (insight1 && !insight1.conflict_with) {
      insight1.conflict_with = conflict.insight2Title;
      insight1.conflict_type = conflict.conflictType;
      markedCount++;
    }

    if (insight2 && !insight2.conflict_with) {
      insight2.conflict_with = conflict.insight1Title;
      insight2.conflict_type = conflict.conflictType;
      markedCount++;
    }
  }

  return markedCount;
}
