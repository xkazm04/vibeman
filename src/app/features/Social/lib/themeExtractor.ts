/**
 * Theme Extractor
 * Extracts overarching themes from feedback clusters and tracks
 * theme frequency over time windows.
 */

import type { FeedbackItem } from './types/feedbackTypes';
import type { FeedbackCluster } from './semanticClusterer';

export interface FeedbackTheme {
  id: string;
  label: string;
  keywords: string[];
  itemCount: number;
  /** Percentage of total feedback this theme represents */
  percentage: number;
  /** Average priority of items in this theme */
  avgPriority: number;
  /** Most common sentiment in this theme */
  dominantSentiment: string | null;
  /** Channels this theme appears in */
  channels: string[];
  /** Trend: increasing, decreasing, or stable */
  trend: 'increasing' | 'decreasing' | 'stable';
  /** Items belonging to this theme */
  itemIds: string[];
  firstSeen: string;
  lastSeen: string;
}

export interface ThemeTimeWindow {
  windowStart: string;
  windowEnd: string;
  themes: Array<{
    themeId: string;
    label: string;
    count: number;
  }>;
}

const PRIORITY_SCORES: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// Common stop words for keyword extraction
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'to', 'of', 'in', 'for', 'on',
  'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'up',
  'down', 'and', 'or', 'but', 'not', 'so', 'if', 'it', 'its', 'my',
  'your', 'his', 'her', 'our', 'their', 'this', 'that', 'these', 'those',
  'i', 'me', 'we', 'you', 'he', 'she', 'they', 'them', 'what', 'which',
  'who', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'no', 'only', 'very', 'just', 'than', 'too', 'also',
  'get', 'got', 'really', 'like', 'even', 'still', 'much', 'well', 'back',
  'know', 'about', 'over', 'such', 'take', 'make', 'way', 'thing',
]);

/**
 * Extract keywords from text with frequency
 */
function extractKeywords(text: string, topN = 8): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

/**
 * Get combined text for a set of feedback items
 */
function getCombinedText(items: FeedbackItem[]): string {
  return items
    .map(item => [item.content.subject || '', item.content.body, ...(item.tags || [])].join(' '))
    .join(' ');
}

/**
 * Generate a human-readable theme label from keywords
 */
function generateThemeLabel(keywords: string[]): string {
  if (keywords.length === 0) return 'General Feedback';
  // Take top 2-3 keywords and capitalize them
  return keywords
    .slice(0, 3)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' & ');
}

/**
 * Determine the dominant sentiment from a list of items
 */
function getDominantSentiment(items: FeedbackItem[]): string | null {
  const sentiments = items
    .map(item => item.analysis?.sentiment)
    .filter(Boolean) as string[];

  if (sentiments.length === 0) return null;

  const freq = new Map<string, number>();
  for (const s of sentiments) {
    freq.set(s, (freq.get(s) || 0) + 1);
  }

  let maxCount = 0;
  let dominant: string | null = null;
  for (const [sentiment, count] of freq) {
    if (count > maxCount) {
      maxCount = count;
      dominant = sentiment;
    }
  }
  return dominant;
}

/**
 * Extract themes from feedback clusters.
 * Each cluster becomes a theme with metadata.
 */
export function extractThemes(
  clusters: FeedbackCluster[],
  totalItems: number
): FeedbackTheme[] {
  return clusters
    .filter(cluster => cluster.label !== 'Unclustered' && cluster.size > 0)
    .map(cluster => {
      const combinedText = getCombinedText(cluster.items);
      const keywords = cluster.centroidKeywords.length > 0
        ? cluster.centroidKeywords
        : extractKeywords(combinedText);

      const timestamps = cluster.items
        .map(i => new Date(i.timestamp).getTime())
        .sort((a, b) => a - b);

      const avgPriority = cluster.items.reduce(
        (sum, item) => sum + (PRIORITY_SCORES[item.priority] || 1),
        0
      ) / cluster.items.length;

      const channels = [...new Set(cluster.items.map(i => i.channel))];

      return {
        id: cluster.id,
        label: cluster.label || generateThemeLabel(keywords),
        keywords,
        itemCount: cluster.size,
        percentage: totalItems > 0 ? Math.round((cluster.size / totalItems) * 1000) / 10 : 0,
        avgPriority: Math.round(avgPriority * 10) / 10,
        dominantSentiment: getDominantSentiment(cluster.items),
        channels,
        trend: 'stable' as const, // Will be computed with time windows
        itemIds: cluster.items.map(i => i.id),
        firstSeen: timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : new Date().toISOString(),
        lastSeen: timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : new Date().toISOString(),
      };
    })
    .sort((a, b) => b.itemCount - a.itemCount);
}

/**
 * Extract themes directly from feedback items (without pre-clustering).
 * Uses keyword frequency to identify themes.
 */
export function extractThemesFromItems(
  items: FeedbackItem[],
  maxThemes = 10
): FeedbackTheme[] {
  if (items.length === 0) return [];

  // Extract keywords from all items with document frequency
  const docFreq = new Map<string, Set<string>>();
  const itemKeywords = new Map<string, string[]>();

  for (const item of items) {
    const text = [item.content.subject || '', item.content.body, ...(item.tags || [])].join(' ');
    const keywords = extractKeywords(text, 15);
    itemKeywords.set(item.id, keywords);

    for (const kw of keywords) {
      if (!docFreq.has(kw)) docFreq.set(kw, new Set());
      docFreq.get(kw)!.add(item.id);
    }
  }

  // Find top keywords that appear in multiple items (themes)
  const themeKeywords = [...docFreq.entries()]
    .filter(([, docs]) => docs.size >= 2) // Minimum 2 items to be a theme
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, maxThemes * 2); // Get more than we need, then deduplicate

  // Group overlapping keywords into themes
  const assignedItems = new Set<string>();
  const themes: FeedbackTheme[] = [];

  for (const [keyword, itemIds] of themeKeywords) {
    if (themes.length >= maxThemes) break;

    // Skip if most items are already assigned
    const unassigned = [...itemIds].filter(id => !assignedItems.has(id));
    if (unassigned.length < 2) continue;

    // Find co-occurring keywords for this theme
    const themeItems = items.filter(i => itemIds.has(i.id));
    const coKeywords = extractKeywords(getCombinedText(themeItems), 5);

    const timestamps = themeItems
      .map(i => new Date(i.timestamp).getTime())
      .sort((a, b) => a - b);

    const avgPriority = themeItems.reduce(
      (sum, item) => sum + (PRIORITY_SCORES[item.priority] || 1),
      0
    ) / themeItems.length;

    themes.push({
      id: `theme-${keyword}-${Date.now()}`,
      label: generateThemeLabel(coKeywords.length > 0 ? coKeywords : [keyword]),
      keywords: coKeywords.length > 0 ? coKeywords : [keyword],
      itemCount: themeItems.length,
      percentage: Math.round((themeItems.length / items.length) * 1000) / 10,
      avgPriority: Math.round(avgPriority * 10) / 10,
      dominantSentiment: getDominantSentiment(themeItems),
      channels: [...new Set(themeItems.map(i => i.channel))],
      trend: 'stable',
      itemIds: themeItems.map(i => i.id),
      firstSeen: timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : new Date().toISOString(),
      lastSeen: timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : new Date().toISOString(),
    });

    // Mark items as assigned
    for (const id of itemIds) assignedItems.add(id);
  }

  return themes;
}

/**
 * Compute theme frequency over time windows.
 * Divides the feedback timeline into windows and counts theme occurrences.
 */
export function computeThemeTimeline(
  themes: FeedbackTheme[],
  items: FeedbackItem[],
  windowDays = 7,
  windowCount = 4
): ThemeTimeWindow[] {
  const now = Date.now();
  const windows: ThemeTimeWindow[] = [];

  for (let i = windowCount - 1; i >= 0; i--) {
    const windowEnd = new Date(now - i * windowDays * 86400000);
    const windowStart = new Date(windowEnd.getTime() - windowDays * 86400000);

    const windowItems = items.filter(item => {
      const ts = new Date(item.timestamp).getTime();
      return ts >= windowStart.getTime() && ts < windowEnd.getTime();
    });

    const windowItemIds = new Set(windowItems.map(i => i.id));

    const themesCounts = themes.map(theme => ({
      themeId: theme.id,
      label: theme.label,
      count: theme.itemIds.filter(id => windowItemIds.has(id)).length,
    })).filter(t => t.count > 0);

    windows.push({
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      themes: themesCounts,
    });
  }

  // Update theme trends based on timeline
  for (const theme of themes) {
    const counts = windows.map(w => {
      const entry = w.themes.find(t => t.themeId === theme.id);
      return entry?.count || 0;
    });
    const firstHalf = counts.slice(0, Math.floor(counts.length / 2)).reduce((s, c) => s + c, 0);
    const secondHalf = counts.slice(Math.floor(counts.length / 2)).reduce((s, c) => s + c, 0);

    if (secondHalf > firstHalf * 1.3) theme.trend = 'increasing';
    else if (secondHalf < firstHalf * 0.7) theme.trend = 'decreasing';
    else theme.trend = 'stable';
  }

  return windows;
}
