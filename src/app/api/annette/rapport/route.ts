/**
 * API Route: Annette Developer Rapport
 *
 * GET /api/annette/rapport?projectId=xxx
 *   Returns the current rapport model for a project
 *
 * PUT /api/annette/rapport
 *   Manually adjust rapport axes (e.g., user toggling personality preferences)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRapportData } from '@/lib/annette/rapportEngine';
import { annetteDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const rapport = getRapportData(projectId);

    // Parse JSON fields for the response
    let expertiseAreas: string[] = [];
    let workRhythm: Record<string, unknown> = {};
    let emotionalHistory: unknown[] = [];
    let communicationSignals: Record<string, unknown> = {};

    try { expertiseAreas = JSON.parse(rapport.expertise_areas || '[]'); } catch { /* empty */ }
    try { workRhythm = JSON.parse(rapport.work_rhythm || '{}'); } catch { /* empty */ }
    try { emotionalHistory = JSON.parse(rapport.emotional_history || '[]'); } catch { /* empty */ }
    try { communicationSignals = JSON.parse(rapport.communication_signals || '{}'); } catch { /* empty */ }

    return NextResponse.json({
      id: rapport.id,
      projectId: rapport.project_id,
      axes: {
        tone: { value: rapport.tone_formal_casual, label: rapport.tone_formal_casual > 0.5 ? 'Casual' : 'Formal' },
        depth: { value: rapport.depth_expert_teaching, label: rapport.depth_expert_teaching > 0.5 ? 'Teaching' : 'Expert' },
        initiative: { value: rapport.initiative_reactive_proactive, label: rapport.initiative_reactive_proactive > 0.5 ? 'Proactive' : 'Reactive' },
        humor: { value: rapport.humor_level, label: rapport.humor_level > 0.4 ? 'Playful' : 'Professional' },
      },
      mood: rapport.detected_mood,
      frustrationScore: rapport.frustration_score,
      totalTurnsAnalyzed: rapport.total_turns_analyzed,
      expertiseAreas,
      workRhythm,
      emotionalHistory,
      communicationSignals,
      createdAt: rapport.created_at,
      updatedAt: rapport.updated_at,
    });
  } catch (error) {
    logger.error('[API] Rapport GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, axes } = body as {
      projectId: string;
      axes?: {
        tone?: number;
        depth?: number;
        initiative?: number;
        humor?: number;
      };
    };

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const updates: Record<string, number> = {};
    if (axes?.tone !== undefined) updates.tone_formal_casual = clamp01(axes.tone);
    if (axes?.depth !== undefined) updates.depth_expert_teaching = clamp01(axes.depth);
    if (axes?.initiative !== undefined) updates.initiative_reactive_proactive = clamp01(axes.initiative);
    if (axes?.humor !== undefined) updates.humor_level = clamp01(axes.humor);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid axes provided' }, { status: 400 });
    }

    annetteDb.rapport.update(projectId, updates);

    logger.info('[API] Rapport updated manually', { projectId, axes: updates });

    return NextResponse.json({ success: true, updated: updates });
  } catch (error) {
    logger.error('[API] Rapport PUT error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
