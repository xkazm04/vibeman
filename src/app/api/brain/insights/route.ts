/**
 * Brain Insights API
 * GET: Fetch all insights (per-project or global) with reflection IDs
 * DELETE: Remove a specific insight
 * PATCH: Resolve a conflict between insights
 * POST: Batch-resolve evidence IDs to direction summaries
 */

import { NextRequest, NextResponse } from 'next/server';
import { brainInsightDb, directionDb, brainReflectionDb } from '@/app/db';
import { getDatabase } from '@/app/db/connection';
import { getHotWritesDatabase } from '@/app/db/hot-writes';
import { withObservability } from '@/lib/observability/middleware';
import type { LearningInsight, EvidenceRef } from '@/app/db/models/brain.types';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';

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
      return buildErrorResponse('projectId or scope=global required', { status: 400 });
    }

    const includeHistory = searchParams.get('includeHistory') !== 'false';
    const insights = brainInsightDb.getWithMeta(projectId, scope === 'global', includeHistory);
    return buildSuccessResponse({ insights });
  } catch (error) {
    console.error('[Brain Insights GET] Error:', error);
    return buildErrorResponse('Failed to fetch insights');
  }
}

async function handleDelete(request: NextRequest) {
  try {
    const body = await request.json();
    const { reflectionId, insightTitle } = body;

    if (!reflectionId || !insightTitle) {
      return buildErrorResponse('reflectionId and insightTitle required', { status: 400 });
    }

    const deleted = brainInsightDb.deleteByTitle(reflectionId, insightTitle);
    if (!deleted) {
      return buildErrorResponse('Insight not found', { status: 404 });
    }

    const remaining = brainInsightDb.countByReflection(reflectionId);
    return buildSuccessResponse({ remaining });
  } catch (error) {
    console.error('[Brain Insights DELETE] Error:', error);
    return buildErrorResponse('Failed to delete insight');
  }
}

/**
 * POST /api/brain/insights
 * Batch-resolve typed evidence refs to summaries using a single UNION ALL query
 * instead of 3 separate queries per type.
 *
 * Accepts:
 * - { evidenceRefs: EvidenceRef[] } (new format with typed refs)
 * - { evidenceIds: string[] } (legacy format, treated as directions)
 * - { insightId: string } (resolve evidence for a specific insight via junction table)
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    // Option 1: Resolve evidence for a specific insight using junction table
    if (body.insightId) {
      const refs = brainInsightDb.getEvidenceForInsight(body.insightId);
      if (refs.length === 0) {
        return buildSuccessResponse({ evidence: {} });
      }
      // Fall through to resolve these refs
      return resolveEvidenceRefs(refs);
    }

    // Option 2: Accept both new typed refs and legacy string IDs
    let refs: EvidenceRef[];
    if (Array.isArray(body.evidenceRefs)) {
      refs = body.evidenceRefs.slice(0, 50);
    } else if (Array.isArray(body.evidenceIds)) {
      refs = body.evidenceIds.slice(0, 50).map((id: string) => ({ type: 'direction' as const, id }));
    } else {
      return buildErrorResponse('evidenceRefs, evidenceIds, or insightId required', { status: 400 });
    }

    if (refs.length === 0) {
      return buildSuccessResponse({ evidence: {} });
    }

    return resolveEvidenceRefs(refs);
  } catch (error) {
    console.error('[Brain Insights POST] Error:', error);
    return buildErrorResponse('Failed to resolve evidence');
  }
}

/**
 * Resolve evidence references using a single UNION ALL query.
 * Replaces 3 separate queries (direction, signal, reflection) with one unified query.
 */
function resolveEvidenceRefs(refs: EvidenceRef[]): NextResponse {
  const db = getDatabase();
  const hotDb = getHotWritesDatabase();

  // Partition by type for the UNION query
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

  // Build UNION ALL query for single-pass resolution
  const queries: string[] = [];
  const params: unknown[] = [];

  if (directionIds.length > 0) {
    const placeholders = directionIds.map(() => '?').join(',');
    queries.push(`
      SELECT
        'direction' AS refType,
        id,
        summary,
        status,
        context_name AS contextName,
        context_map_title AS contextMapTitle,
        created_at AS createdAt
      FROM directions
      WHERE id IN (${placeholders})
    `);
    params.push(...directionIds);
  }

  if (reflectionIds.length > 0) {
    const placeholders = reflectionIds.map(() => '?').join(',');
    queries.push(`
      SELECT
        'reflection' AS refType,
        id,
        'Reflection (' || scope || ') — ' || status AS summary,
        NULL AS status,
        NULL AS contextName,
        NULL AS contextMapTitle,
        created_at AS createdAt
      FROM brain_reflections
      WHERE id IN (${placeholders})
    `);
    params.push(...reflectionIds);
  }

  // Execute unified query
  if (queries.length > 0) {
    const unifiedQuery = queries.join(' UNION ALL ');
    const rows = db.prepare(unifiedQuery).all(...params) as Array<{
      refType: string;
      id: string;
      summary: string;
      status: string | null;
      contextName: string | null;
      contextMapTitle: string | null;
      createdAt: string;
    }>;

    for (const row of rows) {
      resolved[row.id] = {
        refType: row.refType as EvidenceRef['type'],
        id: row.id,
        summary: row.summary,
        status: row.status ?? undefined,
        contextName: row.contextName,
        contextMapTitle: row.contextMapTitle ?? undefined,
        createdAt: row.createdAt,
      };
    }
  }

  // Signals are in hot-writes DB, handle separately
  if (signalIds.length > 0) {
    const placeholders = signalIds.map(() => '?').join(',');
    const rows = hotDb.prepare(
      `SELECT id, signal_type, context_name, created_at FROM behavioral_signals WHERE id IN (${placeholders})`
    ).all(...signalIds) as Array<{ id: string; signal_type: string; context_name: string | null; created_at: string }>;
    for (const sig of rows) {
      resolved[sig.id] = {
        refType: 'signal',
        id: sig.id,
        summary: `Signal: ${sig.signal_type}`,
        contextName: sig.context_name,
        createdAt: sig.created_at,
      };
    }
  }

  // Fill in nulls for missing refs
  for (const ref of refs) {
    if (!(ref.id in resolved)) {
      resolved[ref.id] = null;
    }
  }

  return buildSuccessResponse({ evidence: resolved });
}

/**
 * PATCH /api/brain/insights
 * Resolve a conflict between insights
 * Body: { reflectionId, insightTitle, resolution: 'keep_both' | 'keep_this' | 'keep_other' }
 */
async function handlePatch(request: NextRequest) {
  try {
    const body = await request.json();
    const { reflectionId, insightTitle, resolution } = body;

    if (!reflectionId || !insightTitle || !resolution) {
      return buildErrorResponse('reflectionId, insightTitle, and resolution required', { status: 400 });
    }

    if (!['keep_both', 'keep_this', 'keep_other'].includes(resolution)) {
      return buildErrorResponse('resolution must be keep_both, keep_this, or keep_other', { status: 400 });
    }

    // Search directly in the reflection's insights
    const reflectionInsights = brainInsightDb.getByReflection(reflectionId);
    const insightRow = reflectionInsights.find(i => i.title === insightTitle);

    if (!insightRow) {
      return buildErrorResponse('Insight not found', { status: 404 });
    }

    // Look up the conflicting insight by ID (cross-reflection), not by title within same reflection
    const otherInsight = insightRow.conflict_with_id
      ? brainInsightDb.getById(insightRow.conflict_with_id)
      : null;

    if (resolution === 'keep_both') {
      // Mark both as resolved
      brainInsightDb.update(insightRow.id, {
        conflict_resolved: 1,
        conflict_resolution: 'keep_both',
      });
      if (otherInsight) {
        brainInsightDb.update(otherInsight.id, {
          conflict_resolved: 1,
          conflict_resolution: 'keep_both',
        });
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
      if (otherInsight) {
        brainInsightDb.delete(otherInsight.id);
      }
    } else if (resolution === 'keep_other') {
      // Delete this, resolve the other
      brainInsightDb.delete(insightRow.id);
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

    const remaining = brainInsightDb.countByReflection(reflectionId);
    return buildSuccessResponse({ resolution, remaining });
  } catch (error) {
    console.error('[Brain Insights PATCH] Error:', error);
    return buildErrorResponse('Failed to resolve conflict');
  }
}

export const GET = withObservability(handleGet, '/api/brain/insights');
export const POST = withObservability(handlePost, '/api/brain/insights');
export const DELETE = withObservability(handleDelete, '/api/brain/insights');
export const PATCH = withObservability(handlePatch, '/api/brain/insights');
