/**
 * Brain Insights API
 * GET: Fetch all insights (per-project or global) with reflection IDs
 * DELETE: Remove a specific insight
 * PATCH: Resolve a conflict between insights
 * POST: Batch-resolve evidence IDs to direction summaries
 */

import { NextRequest, NextResponse } from 'next/server';
import { brainInsightDb, directionDb, brainReflectionDb } from '@/app/db';
import { getHotWritesDatabase } from '@/app/db/hot-writes';
import { withObservability } from '@/lib/observability/middleware';
import type { LearningInsight, EvidenceRef } from '@/app/db/models/brain.types';

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

    const remaining = brainInsightDb.countByReflection(reflectionId);
    return NextResponse.json({ success: true, remaining });
  } catch (error) {
    console.error('[Brain Insights DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete insight' }, { status: 500 });
  }
}

/**
 * POST /api/brain/insights
 * Batch-resolve typed evidence refs to summaries.
 * Accepts both new format { evidenceRefs: EvidenceRef[] } and
 * legacy format { evidenceIds: string[] } (treated as directions).
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    // Accept both new typed refs and legacy string IDs
    let refs: EvidenceRef[];
    if (Array.isArray(body.evidenceRefs)) {
      refs = body.evidenceRefs.slice(0, 50);
    } else if (Array.isArray(body.evidenceIds)) {
      refs = body.evidenceIds.slice(0, 50).map((id: string) => ({ type: 'direction' as const, id }));
    } else {
      return NextResponse.json(
        { error: 'evidenceRefs or evidenceIds array required' },
        { status: 400 }
      );
    }

    if (refs.length === 0) {
      return NextResponse.json(
        { error: 'evidenceRefs array must not be empty' },
        { status: 400 }
      );
    }

    // Partition by type
    const directionIds = refs.filter(r => r.type === 'direction').map(r => r.id);
    const signalIds = refs.filter(r => r.type === 'signal').map(r => r.id);
    const reflectionIds = refs.filter(r => r.type === 'reflection').map(r => r.id);

    const resolved: Record<string, {
      refType: EvidenceRef['type'];
      id: string;
      summary: string;
      status?: string;
      contextName?: string | null;
      contextMapTitle?: string;
      createdAt: string;
    } | null> = {};

    // Resolve directions (batch)
    if (directionIds.length > 0) {
      const directionMap = directionDb.getDirectionsByIds(directionIds);
      for (const id of directionIds) {
        const direction = directionMap.get(id);
        resolved[id] = direction ? {
          refType: 'direction',
          id: direction.id,
          summary: direction.summary,
          status: direction.status,
          contextName: direction.context_name,
          contextMapTitle: direction.context_map_title,
          createdAt: direction.created_at,
        } : null;
      }
    }

    // Resolve signals (batch via raw query)
    if (signalIds.length > 0) {
      const hotDb = getHotWritesDatabase();
      const placeholders = signalIds.map(() => '?').join(',');
      const rows = hotDb.prepare(
        `SELECT id, signal_type, context_name, created_at FROM behavioral_signals WHERE id IN (${placeholders})`
      ).all(...signalIds) as Array<{ id: string; signal_type: string; context_name: string | null; created_at: string }>;
      const signalMap = new Map(rows.map(r => [r.id, r]));
      for (const id of signalIds) {
        const sig = signalMap.get(id);
        resolved[id] = sig ? {
          refType: 'signal',
          id: sig.id,
          summary: `Signal: ${sig.signal_type}`,
          contextName: sig.context_name,
          createdAt: sig.created_at,
        } : null;
      }
    }

    // Resolve reflections (batch)
    if (reflectionIds.length > 0) {
      for (const id of reflectionIds) {
        const ref = brainReflectionDb.getById(id);
        resolved[id] = ref ? {
          refType: 'reflection',
          id: ref.id,
          summary: `Reflection (${ref.scope}) — ${ref.status}`,
          createdAt: ref.created_at,
        } : null;
      }
    }

    return NextResponse.json({ success: true, evidence: resolved });
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
