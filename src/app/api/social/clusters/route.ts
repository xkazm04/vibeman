/**
 * Social Clusters API
 *
 * POST /api/social/clusters - Cluster feedback items
 * GET /api/social/clusters - Get clusters with duplicates
 */

import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { clusterFeedback, findRelated } from '@/app/features/Social/lib/semanticClusterer';
import { groupDuplicates, findDuplicatesFor } from '@/app/features/Social/lib/duplicateDetector';
import type { FeedbackItem } from '@/app/features/Social/lib/types/feedbackTypes';

/**
 * POST /api/social/clusters
 * Cluster provided feedback items and detect duplicates.
 *
 * Body:
 *   - items: FeedbackItem[]
 *   - options?: { threshold?: number; minClusterSize?: number; duplicateThreshold?: number }
 *
 * Returns:
 *   - clusters: FeedbackCluster[]
 *   - duplicateGroups: DuplicateGroup[]
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
      threshold = 0.15,
      minClusterSize = 2,
      duplicateThreshold = 0.5,
    } = options;

    // Cluster feedback
    const clusters = clusterFeedback(items as FeedbackItem[], threshold, minClusterSize);

    // Detect duplicates
    const duplicateGroups = groupDuplicates(items as FeedbackItem[], duplicateThreshold);

    return NextResponse.json({
      success: true,
      clusters,
      duplicateGroups,
      stats: {
        totalItems: items.length,
        clusteredItems: clusters.reduce((sum, c) => sum + c.size, 0),
        clusterCount: clusters.filter(c => c.label !== 'Unclustered').length,
        duplicateGroupCount: duplicateGroups.length,
        duplicateItemCount: duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0),
      },
    });
  } catch (error) {
    console.error('[Social Clusters POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cluster feedback' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/clusters
 * Find related items or duplicates for a single item.
 *
 * Query params:
 *   - mode: 'related' | 'duplicates'
 *   - targetId: ID of the target item
 *   - items: JSON-encoded array of all items (for comparison)
 *   - threshold: similarity threshold (optional)
 *   - topN: max results for related mode (optional, default 5)
 */
async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'related';
  const targetId = searchParams.get('targetId');
  const itemsJson = searchParams.get('items');
  const threshold = parseFloat(searchParams.get('threshold') || '0.1');
  const topN = parseInt(searchParams.get('topN') || '5', 10);

  if (!targetId || !itemsJson) {
    return NextResponse.json(
      { error: 'targetId and items are required' },
      { status: 400 }
    );
  }

  try {
    const items: FeedbackItem[] = JSON.parse(itemsJson);
    const targetItem = items.find(i => i.id === targetId);

    if (!targetItem) {
      return NextResponse.json(
        { error: 'Target item not found in provided items' },
        { status: 404 }
      );
    }

    if (mode === 'duplicates') {
      const duplicates = findDuplicatesFor(targetItem, items, threshold);
      return NextResponse.json({ success: true, duplicates });
    } else {
      const related = findRelated(targetItem, items, topN);
      return NextResponse.json({ success: true, related });
    }
  } catch (error) {
    console.error('[Social Clusters GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to find related items' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/social/clusters');
export const POST = withObservability(handlePost, '/api/social/clusters');
