/**
 * Idea near-duplicate detection (save-time programmatic dedup).
 *
 * Prompt-only dedup (serializing every prior idea into the generation prompt) is
 * both unbounded in token cost and unreliable — the LLM still re-proposes
 * near-identical ideas. This module provides a cheap, deterministic second line
 * of defense applied at INSERT time: normalize the title, then reject a
 * candidate whose title is an exact normalized match or a high word-overlap
 * (Jaccard) match of an already-stored idea in the same context.
 *
 * Pure + dependency-free so it is trivially unit-testable and safe to call in a
 * tight save loop.
 */

/** Jaccard similarity at/above which two titles are treated as the same idea. */
export const NEAR_DUPLICATE_THRESHOLD = 0.8;

/**
 * Common filler words stripped before comparison so "Add a cache for X" and
 * "Add caching for X" collapse to the same signal. Deliberately small — only
 * words with no discriminating value.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'to', 'for', 'of', 'and', 'or', 'in', 'on', 'with',
  'add', 'use', 'using', 'via', 'that', 'this', 'is', 'are', 'be', 'by',
]);

/**
 * Normalize a title to a canonical form: lowercase, punctuation → space,
 * whitespace collapsed. Used for exact-match comparison and as the basis for
 * tokenization.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokenize a normalized title into a set of significant words (stop-words removed). */
export function titleTokens(title: string): Set<string> {
  const tokens = normalizeTitle(title)
    .split(' ')
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
  // If stripping stop-words emptied the set (e.g. "Use the cache"), fall back to
  // the raw normalized tokens so we never compare against an empty set.
  if (tokens.length === 0) {
    return new Set(normalizeTitle(title).split(' ').filter(Boolean));
  }
  return new Set(tokens);
}

/** Jaccard similarity (|A∩B| / |A∪B|) between two title token sets. */
export function titleSimilarity(a: string, b: string): number {
  const setA = titleTokens(a);
  const setB = titleTokens(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * True when `candidate` is a near-duplicate of any title in `existing`.
 * A match is either an exact normalized-title equality or a Jaccard word
 * overlap at/above `threshold`.
 */
export function isNearDuplicateTitle(
  candidate: string,
  existing: Iterable<string>,
  threshold: number = NEAR_DUPLICATE_THRESHOLD
): boolean {
  const normCandidate = normalizeTitle(candidate);
  if (!normCandidate) return false;
  for (const other of existing) {
    const normOther = normalizeTitle(other);
    if (!normOther) continue;
    if (normOther === normCandidate) return true;
    if (titleSimilarity(candidate, other) >= threshold) return true;
  }
  return false;
}
