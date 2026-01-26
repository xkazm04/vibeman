/**
 * Social Themes API
 *
 * POST /api/social/themes - Extract themes from feedback items
 * GET /api/social/themes - Get theme timeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { clusterFeedback } from '@/app/features/Social/lib/semanticClusterer';
import {
  extractThemes,
  extractThemesFromItems,
  computeThemeTimeline,
} from '@/app/features/Social/lib/themeExtractor';
import type { FeedbackItem } from '@/app/features/Social/lib/types/feedbackTypes';

/**
 * POST /api/social/themes
 * Extract themes from provided feedback items.
 *
 * Body:
 *   - items: FeedbackItem[]
 *   - options?: {
 *       maxThemes?: number;
 *       clusterThreshold?: number;
 *       includeTimeline?: boolean;
 *       timelineWindowDays?: number;
 *       timelineWindowCount?: number;
 *     }
 *
 * Returns:
 *   - themes: FeedbackTheme[]
 *   - timeline?: ThemeTimeWindow[] (if includeTimeline is true)
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, options = {} } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required and must not be empty' },
        { status: 400 }
      );
    }

    const {
      maxThemes = 10,
      clusterThreshold = 0.15,
      includeTimeline = true,
      timelineWindowDays = 7,
      timelineWindowCount = 4,
    } = options;

    const feedbackItems = items as FeedbackItem[];

    // First, cluster the feedback
    const clusters = clusterFeedback(feedbackItems, clusterThreshold, 2);

    // Extract themes from clusters
    let themes = extractThemes(clusters, feedbackItems.length);

    // If we got fewer themes than desired, supplement with direct extraction
    if (themes.length < maxThemes) {
      const directThemes = extractThemesFromItems(feedbackItems, maxThemes);
      // Merge, avoiding duplicates by keyword overlap
      const existingKeywords = new Set(themes.flatMap(t => t.keywords));
      for (const theme of directThemes) {
        if (themes.length >= maxThemes) break;
        const overlap = theme.keywords.filter(k => existingKeywords.has(k)).length;
        if (overlap < theme.keywords.length / 2) {
          themes.push(theme);
          theme.keywords.forEach(k => existingKeywords.add(k));
        }
      }
    }

    // Limit to maxThemes
    themes = themes.slice(0, maxThemes);

    // Compute timeline if requested
    let timeline = null;
    if (includeTimeline && themes.length > 0) {
      timeline = computeThemeTimeline(themes, feedbackItems, timelineWindowDays, timelineWindowCount);
    }

    // Compute summary stats
    const trendingUp = themes.filter(t => t.trend === 'increasing').length;
    const trendingDown = themes.filter(t => t.trend === 'decreasing').length;
    const topTheme = themes.length > 0 ? themes[0] : null;

    return NextResponse.json({
      success: true,
      themes,
      timeline,
      stats: {
        totalItems: feedbackItems.length,
        themeCount: themes.length,
        itemsCovered: themes.reduce((sum, t) => sum + t.itemCount, 0),
        coveragePercent: Math.round(
          (themes.reduce((sum, t) => sum + t.itemCount, 0) / feedbackItems.length) * 100
        ),
        trendingUp,
        trendingDown,
        topTheme: topTheme ? { label: topTheme.label, count: topTheme.itemCount } : null,
      },
    });
  } catch (error) {
    console.error('[Social Themes POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract themes' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/themes
 * Get theme timeline for tracking trends.
 *
 * Query params:
 *   - items: JSON-encoded FeedbackItem[]
 *   - windowDays: number (default 7)
 *   - windowCount: number (default 4)
 */
async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const itemsJson = searchParams.get('items');
  const windowDays = parseInt(searchParams.get('windowDays') || '7', 10);
  const windowCount = parseInt(searchParams.get('windowCount') || '4', 10);

  if (!itemsJson) {
    return NextResponse.json(
      { error: 'items query param is required' },
      { status: 400 }
    );
  }

  try {
    const items: FeedbackItem[] = JSON.parse(itemsJson);
    const clusters = clusterFeedback(items, 0.15, 2);
    const themes = extractThemes(clusters, items.length);
    const timeline = computeThemeTimeline(themes, items, windowDays, windowCount);

    return NextResponse.json({
      success: true,
      themes: themes.map(t => ({ id: t.id, label: t.label, trend: t.trend, itemCount: t.itemCount })),
      timeline,
    });
  } catch (error) {
    console.error('[Social Themes GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute timeline' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/social/themes');
export const POST = withObservability(handlePost, '/api/social/themes');
