/**
 * Semantic Clusterer
 * Groups related feedback items using text similarity analysis.
 * Uses TF-IDF-like keyword extraction for lightweight clustering
 * without requiring external embedding models.
 */

import type { FeedbackItem } from './types/feedbackTypes';

export interface FeedbackCluster {
  id: string;
  label: string;
  items: FeedbackItem[];
  centroidKeywords: string[];
  averageSentiment: string | null;
  size: number;
  createdAt: string;
}

interface TokenizedItem {
  item: FeedbackItem;
  tokens: string[];
  tokenSet: Set<string>;
}

// Common stop words to ignore during tokenization
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'because', 'but', 'and', 'or', 'if', 'while', 'about', 'up',
  'down', 'it', 'its', 'my', 'your', 'his', 'her', 'our', 'their',
  'this', 'that', 'these', 'those', 'i', 'me', 'we', 'you', 'he', 'she',
  'they', 'them', 'what', 'which', 'who', 'whom', 'get', 'got', 'also',
  'really', 'like', 'even', 'still', 'much', 'well', 'back', 'know',
]);

/**
 * Tokenize a feedback item's text content into meaningful keywords
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

/**
 * Get text content from a feedback item
 */
function getItemText(item: FeedbackItem): string {
  const parts = [
    item.content.subject || '',
    item.content.body,
    ...(item.tags || []),
    item.analysis?.bugTag || '',
  ];
  return parts.join(' ');
}

/**
 * Compute Jaccard similarity between two token sets
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Extract the most common keywords from a set of items (cluster centroid)
 */
function extractCentroidKeywords(items: TokenizedItem[], topN = 5): string[] {
  const freq = new Map<string, number>();
  for (const { tokens } of items) {
    const seen = new Set<string>();
    for (const token of tokens) {
      if (!seen.has(token)) {
        freq.set(token, (freq.get(token) || 0) + 1);
        seen.add(token);
      }
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

/**
 * Generate a cluster label from centroid keywords
 */
function generateLabel(keywords: string[]): string {
  if (keywords.length === 0) return 'Uncategorized';
  return keywords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' / ');
}

/**
 * DBSCAN-like clustering algorithm using Jaccard similarity.
 *
 * @param items - Feedback items to cluster
 * @param threshold - Minimum similarity to consider items related (0-1, default 0.15)
 * @param minClusterSize - Minimum items to form a cluster (default 2)
 */
export function clusterFeedback(
  items: FeedbackItem[],
  threshold = 0.15,
  minClusterSize = 2
): FeedbackCluster[] {
  if (items.length === 0) return [];

  // Tokenize all items
  const tokenized: TokenizedItem[] = items.map(item => {
    const tokens = tokenize(getItemText(item));
    return { item, tokens, tokenSet: new Set(tokens) };
  });

  // Build similarity graph (adjacency list)
  const neighbors: Map<number, number[]> = new Map();
  for (let i = 0; i < tokenized.length; i++) {
    const myNeighbors: number[] = [];
    for (let j = 0; j < tokenized.length; j++) {
      if (i === j) continue;
      const sim = jaccardSimilarity(tokenized[i].tokenSet, tokenized[j].tokenSet);
      if (sim >= threshold) {
        myNeighbors.push(j);
      }
    }
    neighbors.set(i, myNeighbors);
  }

  // Simple connected-component clustering
  const visited = new Set<number>();
  const clusters: TokenizedItem[][] = [];

  for (let i = 0; i < tokenized.length; i++) {
    if (visited.has(i)) continue;

    const itemNeighbors = neighbors.get(i) || [];
    if (itemNeighbors.length < minClusterSize - 1) {
      // Not enough neighbors to form a cluster - skip for now
      continue;
    }

    // BFS to find connected component
    const cluster: number[] = [];
    const queue: number[] = [i];
    visited.add(i);

    while (queue.length > 0) {
      const current = queue.shift()!;
      cluster.push(current);

      for (const neighbor of neighbors.get(current) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (cluster.length >= minClusterSize) {
      clusters.push(cluster.map(idx => tokenized[idx]));
    }
  }

  // Also collect unclustered items into a single "Other" cluster if they exist
  const unclustered = tokenized.filter((_, idx) => !visited.has(idx));

  // Build cluster objects
  const result: FeedbackCluster[] = clusters.map((clusterItems, idx) => {
    const centroidKeywords = extractCentroidKeywords(clusterItems);
    const feedbackItems = clusterItems.map(t => t.item);

    // Compute average sentiment
    const sentiments = feedbackItems
      .map(item => item.analysis?.sentiment)
      .filter(Boolean) as string[];
    const avgSentiment = sentiments.length > 0 ? sentiments[0] : null; // Most common

    return {
      id: `cluster-${idx}-${Date.now()}`,
      label: generateLabel(centroidKeywords),
      items: feedbackItems,
      centroidKeywords,
      averageSentiment: avgSentiment,
      size: feedbackItems.length,
      createdAt: new Date().toISOString(),
    };
  });

  // Add unclustered items as a special cluster if any
  if (unclustered.length > 0) {
    result.push({
      id: `cluster-unclustered-${Date.now()}`,
      label: 'Unclustered',
      items: unclustered.map(t => t.item),
      centroidKeywords: [],
      averageSentiment: null,
      size: unclustered.length,
      createdAt: new Date().toISOString(),
    });
  }

  return result;
}

/**
 * Find the N most similar items to a given item
 */
export function findRelated(
  targetItem: FeedbackItem,
  allItems: FeedbackItem[],
  topN = 5
): Array<{ item: FeedbackItem; similarity: number }> {
  const targetTokens = new Set(tokenize(getItemText(targetItem)));

  return allItems
    .filter(item => item.id !== targetItem.id)
    .map(item => ({
      item,
      similarity: jaccardSimilarity(targetTokens, new Set(tokenize(getItemText(item)))),
    }))
    .filter(r => r.similarity > 0.05)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}
