/**
 * Brain Insights API
 * GET: Fetch all insights (per-project or global) with reflection IDs for deletion
 * DELETE: Remove a specific insight from a reflection
 */

import { NextRequest, NextResponse } from 'next/server';
import { brainReflectionDb, directionDb, getDatabase } from '@/app/db';
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
    const insights = getInsightsWithMeta(projectId, scope === 'global', includeHistory);
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
 * Fetch insights with reflection_id and project_id attached for each entry.
 * When includeHistory=true, also builds confidence history per insight title
 * by tracing through reflections chronologically (using title + evolves field).
 */
function getInsightsWithMeta(projectId: string | null, isGlobal: boolean, includeHistory = true): InsightWithMeta[] {
  const db = getDatabase();

  // Query reflections in chronological order (ASC) for history building
  const queryAsc = isGlobal
    ? `SELECT id, insights_generated, project_id, completed_at FROM brain_reflections
       WHERE status = 'completed' AND insights_generated IS NOT NULL
       ORDER BY completed_at ASC LIMIT 50`
    : `SELECT id, insights_generated, project_id, completed_at FROM brain_reflections
       WHERE project_id = ? AND status = 'completed' AND insights_generated IS NOT NULL
       ORDER BY completed_at ASC LIMIT 30`;

  const rows = (isGlobal
    ? db.prepare(queryAsc).all()
    : db.prepare(queryAsc).all(projectId)) as Array<{ id: string; insights_generated: string; project_id: string; completed_at: string }>;

  // Build confidence history map: canonical title → ConfidencePoint[]
  // We track title aliases via the "evolves" field
  const historyMap = new Map<string, ConfidencePoint[]>();
  // Maps evolved titles to their canonical (current) title
  const titleAliases = new Map<string, string>();

  if (includeHistory) {
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.insights_generated);
        if (!Array.isArray(parsed)) continue;
        for (const insight of parsed as LearningInsight[]) {
          // Resolve canonical title (follow evolves chain)
          let canonicalTitle = insight.title;
          if (insight.evolves && titleAliases.has(insight.evolves)) {
            canonicalTitle = insight.title; // This insight IS the new canonical
            // Update the alias: old title now points to new title
            titleAliases.set(insight.evolves, insight.title);
            // Move history from old canonical to new
            const oldHistory = historyMap.get(insight.evolves);
            if (oldHistory) {
              historyMap.set(insight.title, oldHistory);
              historyMap.delete(insight.evolves);
            }
          } else if (insight.evolves) {
            // First evolution: create alias
            titleAliases.set(insight.evolves, insight.title);
            const oldHistory = historyMap.get(insight.evolves);
            if (oldHistory) {
              historyMap.set(insight.title, oldHistory);
              historyMap.delete(insight.evolves);
            }
          }

          const history = historyMap.get(canonicalTitle) || [];
          history.push({
            confidence: insight.confidence,
            date: row.completed_at,
            reflectionId: row.id,
          });
          historyMap.set(canonicalTitle, history);
        }
      } catch { /* skip corrupted */ }
    }
  }

  // Build result (return in DESC order for display - most recent first)
  const result: InsightWithMeta[] = [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    try {
      const parsed = JSON.parse(row.insights_generated);
      if (Array.isArray(parsed)) {
        for (const insight of parsed) {
          const entry: InsightWithMeta = {
            ...insight,
            reflection_id: row.id,
            project_id: row.project_id,
          };
          if (includeHistory) {
            entry.confidenceHistory = historyMap.get(insight.title) || [
              { confidence: insight.confidence, date: row.completed_at, reflectionId: row.id }
            ];
          }
          result.push(entry);
        }
      }
    } catch { /* skip corrupted */ }
  }
  return result;
}

/**
 * POST /api/brain/insights
 * Batch-resolve evidence IDs (direction IDs) to summaries
 * Body: { evidenceIds: string[] }
 * Returns: { directions: Record<string, DirectionSummary | null> }
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

export const GET = withObservability(handleGet, '/api/brain/insights');
export const POST = withObservability(handlePost, '/api/brain/insights');
export const DELETE = withObservability(handleDelete, '/api/brain/insights');
