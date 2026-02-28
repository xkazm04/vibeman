/**
 * Insight Similarity — shared text normalization and Jaccard overlap.
 *
 * Single source of truth for all insight similarity operations:
 * - Deduplication (brainService.ts) uses 0.8 threshold
 * - Conflict detection (insightConflictDetector.ts) uses 0.4 threshold
 *
 * Consolidates previously copy-pasted normalize + Jaccard functions.
 */

import { normalizeText } from '@/lib/stringUtils';

/**
 * Normalize text for similarity comparison.
 * Lowercases, strips non-alphanumeric chars, collapses whitespace.
 */
export function normalize(text: string): string {
  return normalizeText(text);
}

/**
 * Jaccard token overlap ratio between two strings.
 * Tokens are whitespace-split words from normalized text.
 * Returns 0–1 where 1 means identical token sets.
 *
 * @param minWordLength - minimum word length to include (default: 0, conflict detector uses 4)
 */
export function tokenOverlap(a: string, b: string, minWordLength: number = 0): number {
  const filter = minWordLength > 0
    ? (w: string) => w.length >= minWordLength
    : (_w: string) => true;

  const tokensA = new Set(normalize(a).split(' ').filter(filter));
  const tokensB = new Set(normalize(b).split(' ').filter(filter));

  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/** Default threshold for deduplication (brainService) */
export const DEDUP_THRESHOLD = 0.8;

/** Default threshold for conflict detection (insightConflictDetector) */
export const CONFLICT_THRESHOLD = 0.4;
