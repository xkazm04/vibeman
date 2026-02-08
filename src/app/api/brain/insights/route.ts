/**
 * Brain Insights API
 * GET: Fetch all insights (per-project or global) with reflection IDs
 * DELETE: Remove a specific insight
 * PATCH: Resolve a conflict between insights
 * POST: Batch-resolve evidence IDs to direction summaries
 */

import { NextRequest, NextResponse } from 'next/server';
import { brainInsightDb, directionDb } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';
import type { LearningInsight } from '@/app/db/models/brain.types';

export interface ConfidencePoint {
  confidence: number;
  date: string;
  reflectionId: string;
}

export interface InsightWithMeta extends LearningInsight {
  project_id: string;
  reflection_id: string;
  confidenceHistory?: ConfidencePoint[];
}

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const scope = searchParams.get('scope');

  try {
    if (!projectId && scope !== 'global') {
      return NextResponse.json({ error: 'projectId or scope=global required' }, { status: 400 });
    }

    const includeHistory = searchParams.get('includeHistory') !== 'false';
    const insights = brainInsightDb.getWithMeta(projectId, scope === 'global', includeHistory);
    return NextResponse.json({ insights });
  } catch (error) {
    console.error('[Brain Insights GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}

async function handleDelete(request: NextRequest) {
  try {
    const body = await request.json();
    const { reflectionId, insightTitle } = body;

    if (!reflectionId || !insightTitle) {
      return NextResponse.json(
        { error: 'reflectionId and insightTitle required' },
        { status: 400 }
      );
    }

    const deleted = brainInsightDb.deleteByTitle(reflectionId, insightTitle);
    if (!deleted) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    // Keep JSON blob in sync
    brainInsightDb.syncToReflectionJson(reflectionId);

    const remaining = brainInsightDb.countByReflection(reflectionId);
    return NextResponse.json({ success: true, remaining });
  } catch (error) {
    console.error('[Brain Insights DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete insight' }, { status: 500 });
  }
}

/**
 * POST /api/brain/insights
 * Batch-resolve evidence IDs (direction IDs) to summaries
 * Body: { evidenceIds: string[] }
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { evidenceIds } = body;

    if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
      return NextResponse.json(
        { error: 'evidenceIds array required' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    const ids = evidenceIds.slice(0, 50);

    const directions: Record<string, {
      id: string;
      summary: string;
      status: string;
      contextName: string | null;
      contextMapTitle: string;
      createdAt: string;
    } | null> = {};

    for (const id of ids) {
      const direction = directionDb.getDirectionById(id);
      if (direction) {
        directions[id] = {
          id: direction.id,
          summary: direction.summary,
          status: direction.status,
          contextName: direction.context_name,
          contextMapTitle: direction.context_map_title,
          createdAt: direction.created_at,
        };
      } else {
        directions[id] = null;
      }
    }

    return NextResponse.json({ success: true, directions });
  } catch (error) {
    console.error('[Brain Insights POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve evidence' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/brain/insights
 * Resolve a conflict between insights
 * Body: { reflectionId, insightTitle, resolution: 'keep_both' | 'keep_this' | 'keep_other', conflictingInsightTitle? }
 */
async function handlePatch(request: NextRequest) {
  try {
    const body = await request.json();
    const { reflectionId, insightTitle, resolution, conflictingInsightTitle } = body;

    if (!reflectionId || !insightTitle || !resolution) {
      return NextResponse.json(
        { error: 'reflectionId, insightTitle, and resolution required' },
        { status: 400 }
      );
    }

    if (!['keep_both', 'keep_this', 'keep_other'].includes(resolution)) {
      return NextResponse.json(
        { error: 'resolution must be keep_both, keep_this, or keep_other' },
        { status: 400 }
      );
    }

    // Search directly in the reflection's insights
    const reflectionInsights = brainInsightDb.getByReflection(reflectionId);
    const insightRow = reflectionInsights.find(i => i.title === insightTitle);

    if (!insightRow) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    const conflictTitle = conflictingInsightTitle || insightRow.conflict_with_title;

    if (resolution === 'keep_both') {
      // Mark both as resolved
      brainInsightDb.update(insightRow.id, {
        conflict_resolved: 1,
        conflict_resolution: 'keep_both',
      });
      // Also find and resolve the other side
      if (conflictTitle) {
        const otherInsight = reflectionInsights.find(i => i.title === conflictTitle);
        if (otherInsight) {
          brainInsightDb.update(otherInsight.id, {
            conflict_resolved: 1,
            conflict_resolution: 'keep_both',
          });
        }
      }
    } else if (resolution === 'keep_this') {
      // Resolve this, delete the other
      brainInsightDb.update(insightRow.id, {
        conflict_resolved: 1,
        conflict_resolution: 'keep_this',
        conflict_with_id: null,
        conflict_with_title: null,
        conflict_type: null,
      });
      if (conflictTitle) {
        const otherInsight = reflectionInsights.find(i => i.title === conflictTitle);
        if (otherInsight) {
          brainInsightDb.delete(otherInsight.id);
        }
      }
    } else if (resolution === 'keep_other') {
      // Delete this, resolve the other
      const insightId = insightRow.id;
      brainInsightDb.delete(insightId);
      if (conflictTitle) {
        const otherInsight = reflectionInsights.find(i => i.title === conflictTitle);
        if (otherInsight) {
          brainInsightDb.update(otherInsight.id, {
            conflict_resolved: 1,
            conflict_resolution: 'keep_other',
            conflict_with_id: null,
            conflict_with_title: null,
            conflict_type: null,
          });
        }
      }
    }

    // Keep JSON blob in sync
    brainInsightDb.syncToReflectionJson(reflectionId);

    const remaining = brainInsightDb.countByReflection(reflectionId);
    return NextResponse.json({
      success: true,
      resolution,
      remaining,
    });
  } catch (error) {
    console.error('[Brain Insights PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve conflict' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/brain/insights');
export const POST = withObservability(handlePost, '/api/brain/insights');
export const DELETE = withObservability(handleDelete, '/api/brain/insights');
export const PATCH = withObservability(handlePatch, '/api/brain/insights');
