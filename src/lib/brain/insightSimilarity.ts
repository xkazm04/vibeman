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

/**
 * Cosine threshold above which two embedded titles are treated as semantic
 * duplicates. Sentence-embedding cosine for near-duplicate short titles is high
 * (~0.85–0.95), so this catches paraphrases that share few literal tokens.
 */
export const SEMANTIC_DEDUP_THRESHOLD = 0.85;

/**
 * Cosine similarity of two equal-length vectors. Returns 0 for missing,
 * mismatched, or zero-magnitude vectors. Pure math — safe to import anywhere.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Hybrid duplicate test: true when two titles are lexically OR semantically
 * similar. Jaccard is the cheap gate; an embedding map (when present) upgrades
 * recall by catching paraphrases. Falls back to Jaccard alone whenever an
 * embedding is missing for either title — so callers degrade gracefully when no
 * embedding provider is configured.
 *
 * @param embeddings - map of (trimmed) title → vector; pass undefined for lexical-only
 */
export function isDuplicateTitle(
  a: string,
  b: string,
  embeddings?: Map<string, number[]>,
  jaccardThreshold: number = DEDUP_THRESHOLD,
  semanticThreshold: number = SEMANTIC_DEDUP_THRESHOLD,
): boolean {
  if (tokenOverlap(a, b) >= jaccardThreshold) return true;

  if (embeddings) {
    const va = embeddings.get(a.trim());
    const vb = embeddings.get(b.trim());
    if (va && vb && cosineSimilarity(va, vb) >= semanticThreshold) return true;
  }

  return false;
}
