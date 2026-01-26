/**
 * Duplicate Detector
 * Identifies duplicate and near-duplicate feedback items using
 * content fingerprinting and n-gram overlap analysis.
 */

import type { FeedbackItem } from './types/feedbackTypes';

export interface DuplicateGroup {
  /** The "canonical" item (oldest or highest engagement) */
  primary: FeedbackItem;
  /** Items that are duplicates of the primary */
  duplicates: FeedbackItem[];
  /** Similarity scores for each duplicate relative to primary */
  scores: number[];
}

export interface DuplicateMatch {
  itemA: FeedbackItem;
  itemB: FeedbackItem;
  similarity: number;
  matchType: 'exact' | 'near_duplicate' | 'similar';
}

/**
 * Normalize text for comparison (lowercase, remove punctuation, collapse whitespace)
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate character n-grams for a text
 */
function charNgrams(text: string, n = 3): Set<string> {
  const grams = new Set<string>();
  const normalized = normalize(text);
  for (let i = 0; i <= normalized.length - n; i++) {
    grams.add(normalized.slice(i, i + n));
  }
  return grams;
}

/**
 * Generate word n-grams (shingles) for a text
 */
function wordShingles(text: string, n = 2): Set<string> {
  const words = normalize(text).split(' ').filter(w => w.length > 0);
  const shingles = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    shingles.add(words.slice(i, i + n).join(' '));
  }
  return shingles;
}

/**
 * Compute n-gram overlap similarity (Jaccard on character trigrams)
 */
function ngramSimilarity(a: string, b: string): number {
  const gramsA = charNgrams(a);
  const gramsB = charNgrams(b);
  if (gramsA.size === 0 && gramsB.size === 0) return 1;
  if (gramsA.size === 0 || gramsB.size === 0) return 0;

  let intersection = 0;
  for (const gram of gramsA) {
    if (gramsB.has(gram)) intersection++;
  }
  const union = gramsA.size + gramsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Compute word-shingle overlap similarity
 */
function shingleSimilarity(a: string, b: string): number {
  const shinglesA = wordShingles(a);
  const shinglesB = wordShingles(b);
  if (shinglesA.size === 0 && shinglesB.size === 0) return 1;
  if (shinglesA.size === 0 || shinglesB.size === 0) return 0;

  let intersection = 0;
  for (const shingle of shinglesA) {
    if (shinglesB.has(shingle)) intersection++;
  }
  const union = shinglesA.size + shinglesB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Get the text content for comparison from a feedback item
 */
function getComparisonText(item: FeedbackItem): string {
  return [item.content.subject || '', item.content.body].join(' ');
}

/**
 * Classify the type of match based on similarity score
 */
function classifyMatch(score: number): 'exact' | 'near_duplicate' | 'similar' {
  if (score >= 0.9) return 'exact';
  if (score >= 0.6) return 'near_duplicate';
  return 'similar';
}

/**
 * Detect all duplicate pairs in a set of feedback items.
 *
 * @param items - Feedback items to check
 * @param threshold - Minimum similarity to consider as duplicate (default 0.5)
 * @returns Array of duplicate matches sorted by similarity (highest first)
 */
export function detectDuplicates(
  items: FeedbackItem[],
  threshold = 0.5
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  for (let i = 0; i < items.length; i++) {
    const textA = getComparisonText(items[i]);
    for (let j = i + 1; j < items.length; j++) {
      const textB = getComparisonText(items[j]);

      // Combined similarity: weighted average of n-gram and shingle similarity
      const charSim = ngramSimilarity(textA, textB);
      const wordSim = shingleSimilarity(textA, textB);
      const combinedSim = charSim * 0.4 + wordSim * 0.6;

      if (combinedSim >= threshold) {
        matches.push({
          itemA: items[i],
          itemB: items[j],
          similarity: Math.round(combinedSim * 1000) / 1000,
          matchType: classifyMatch(combinedSim),
        });
      }
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Group duplicates into canonical groups.
 * The "primary" item in each group is the earliest (oldest timestamp)
 * or highest-engagement item.
 *
 * @param items - Feedback items to group
 * @param threshold - Minimum similarity for grouping (default 0.5)
 */
export function groupDuplicates(
  items: FeedbackItem[],
  threshold = 0.5
): DuplicateGroup[] {
  const matches = detectDuplicates(items, threshold);

  // Build union-find structure
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    if (!parent.has(id)) parent.set(id, id);
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)!));
    }
    return parent.get(id)!;
  };
  const union = (a: string, b: string) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  };

  // Union matched items
  for (const match of matches) {
    union(match.itemA.id, match.itemB.id);
  }

  // Group items by root
  const groups = new Map<string, FeedbackItem[]>();
  const itemMap = new Map<string, FeedbackItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
    const root = find(item.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(item);
  }

  // Build DuplicateGroup results (only groups with 2+ items)
  const result: DuplicateGroup[] = [];
  for (const groupItems of groups.values()) {
    if (groupItems.length < 2) continue;

    // Pick primary: earliest timestamp, or highest engagement
    const sorted = [...groupItems].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB; // Earliest first
    });

    const primary = sorted[0];
    const duplicates = sorted.slice(1);

    // Compute scores for each duplicate relative to primary
    const primaryText = getComparisonText(primary);
    const scores = duplicates.map(dup => {
      const charSim = ngramSimilarity(primaryText, getComparisonText(dup));
      const wordSim = shingleSimilarity(primaryText, getComparisonText(dup));
      return Math.round((charSim * 0.4 + wordSim * 0.6) * 1000) / 1000;
    });

    result.push({ primary, duplicates, scores });
  }

  return result.sort((a, b) => b.duplicates.length - a.duplicates.length);
}

/**
 * Check if a single item is a duplicate of any existing items.
 * Useful for real-time duplicate detection on new feedback.
 */
export function findDuplicatesFor(
  newItem: FeedbackItem,
  existingItems: FeedbackItem[],
  threshold = 0.5
): Array<{ item: FeedbackItem; similarity: number; matchType: string }> {
  const newText = getComparisonText(newItem);

  return existingItems
    .filter(item => item.id !== newItem.id)
    .map(item => {
      const existingText = getComparisonText(item);
      const charSim = ngramSimilarity(newText, existingText);
      const wordSim = shingleSimilarity(newText, existingText);
      const similarity = Math.round((charSim * 0.4 + wordSim * 0.6) * 1000) / 1000;
      return { item, similarity, matchType: classifyMatch(similarity) };
    })
    .filter(r => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
}
