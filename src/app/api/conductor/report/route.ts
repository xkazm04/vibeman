/**
 * Conductor Report API
 *
 * GET /api/conductor/report?runId=xxx — Generate markdown report for a run
 * POST /api/conductor/report/rate — Save decision rating
 */

import { NextRequest, NextResponse } from 'next/server';
import { conductorRepository } from '@/app/features/Conductor/lib/conductor.repository';
import { generateV3Report, extractDecisions } from '@/app/features/Conductor/lib/v3/reportGenerator';
import { getDatabase } from '@/app/db/connection';

function getGoalInfo(goalId: string): { title: string; description: string } {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT title, description FROM goals WHERE id = ?').get(goalId) as
      { title: string; description: string } | undefined;
    return row || { title: 'Unknown Goal', description: '' };
  } catch {
    return { title: 'Unknown Goal', description: '' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');

    if (!runId) {
      return NextResponse.json(
        { success: false, error: 'Missing runId parameter' },
        { status: 400 }
      );
    }

    const run = conductorRepository.getRunById(runId);
    if (!run) {
      return NextResponse.json(
        { success: false, error: 'Run not found' },
        { status: 404 }
      );
    }

    const goal = getGoalInfo(run.goal_id);
    const markdown = generateV3Report(run, goal);
    const decisions = extractDecisions(run, goal);

    // Load existing ratings
    let decisionRatings: Record<string, { rating: number; comment?: string }> = {};
    try {
      const db = getDatabase();
      const row = db.prepare('SELECT decision_ratings FROM conductor_runs WHERE id = ?').get(runId) as
        { decision_ratings: string | null } | undefined;
      if (row?.decision_ratings) {
        decisionRatings = JSON.parse(row.decision_ratings);
      }
    } catch { /* column may not exist yet */ }

    return NextResponse.json({
      success: true,
      markdown,
      decisions,
      decisionRatings,
      goal,
    });
  } catch (error) {
    console.error('[conductor/report] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { runId, decisionId, rating, comment } = body;

    if (!runId || !decisionId || typeof rating !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing runId, decisionId, or rating' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Load existing ratings
    let existing: Record<string, { rating: number; comment?: string }> = {};
    try {
      const row = db.prepare('SELECT decision_ratings FROM conductor_runs WHERE id = ?').get(runId) as
        { decision_ratings: string | null } | undefined;
      if (row?.decision_ratings) {
        existing = JSON.parse(row.decision_ratings);
      }
    } catch { /* column may not exist yet */ }

    // Update
    existing[decisionId] = { rating, ...(comment ? { comment } : {}) };

    db.prepare('UPDATE conductor_runs SET decision_ratings = ? WHERE id = ?')
      .run(JSON.stringify(existing), runId);

    return NextResponse.json({ success: true, decisionRatings: existing });
  } catch (error) {
    console.error('[conductor/report/rate] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
