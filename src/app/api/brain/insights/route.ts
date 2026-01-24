/**
 * Brain Insights API
 * GET: Fetch all insights (per-project or global) with reflection IDs for deletion
 * DELETE: Remove a specific insight from a reflection
 */

import { NextRequest, NextResponse } from 'next/server';
import { brainReflectionDb, getDatabase } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';
import type { LearningInsight } from '@/app/db/models/brain.types';

export interface InsightWithMeta extends LearningInsight {
  project_id: string;
  reflection_id: string;
}

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const scope = searchParams.get('scope');

  try {
    if (!projectId && scope !== 'global') {
      return NextResponse.json({ error: 'projectId or scope=global required' }, { status: 400 });
    }

    const insights = getInsightsWithMeta(projectId, scope === 'global');
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

    const reflection = brainReflectionDb.getById(reflectionId);
    if (!reflection) {
      return NextResponse.json({ error: 'Reflection not found' }, { status: 404 });
    }

    let insights: LearningInsight[] = [];
    try {
      insights = JSON.parse(reflection.insights_generated || '[]');
    } catch {
      return NextResponse.json({ error: 'Failed to parse insights' }, { status: 500 });
    }

    const filtered = insights.filter(i => i.title !== insightTitle);
    if (filtered.length === insights.length) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    brainReflectionDb.updateInsights(reflectionId, JSON.stringify(filtered));

    return NextResponse.json({ success: true, remaining: filtered.length });
  } catch (error) {
    console.error('[Brain Insights DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete insight' }, { status: 500 });
  }
}

/**
 * Fetch insights with reflection_id and project_id attached for each entry
 */
function getInsightsWithMeta(projectId: string | null, isGlobal: boolean): InsightWithMeta[] {
  const db = getDatabase();

  const query = isGlobal
    ? `SELECT id, insights_generated, project_id FROM brain_reflections
       WHERE status = 'completed' AND insights_generated IS NOT NULL
       ORDER BY completed_at DESC LIMIT 50`
    : `SELECT id, insights_generated, project_id FROM brain_reflections
       WHERE project_id = ? AND status = 'completed' AND insights_generated IS NOT NULL
       ORDER BY completed_at DESC LIMIT 30`;

  const rows = (isGlobal
    ? db.prepare(query).all()
    : db.prepare(query).all(projectId)) as Array<{ id: string; insights_generated: string; project_id: string }>;

  const result: InsightWithMeta[] = [];
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.insights_generated);
      if (Array.isArray(parsed)) {
        for (const insight of parsed) {
          result.push({
            ...insight,
            reflection_id: row.id,
            project_id: row.project_id,
          });
        }
      }
    } catch { /* skip corrupted */ }
  }
  return result;
}

export const GET = withObservability(handleGet, '/api/brain/insights');
export const DELETE = withObservability(handleDelete, '/api/brain/insights');
