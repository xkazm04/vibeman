/**
 * Conductor Redesign Command Generator API
 *
 * POST /api/conductor/report/redesign — Create .claude/commands files for low-rated decisions
 */

import { NextRequest, NextResponse } from 'next/server';
import { conductorRepository } from '@/app/features/Conductor/lib/conductor.repository';
import { extractDecisions } from '@/app/features/Conductor/lib/v3/reportGenerator';
import { buildRedesignCommand } from '@/app/features/Conductor/lib/v3/redesignTemplate';
import { createRequirement } from '@/app/Claude/sub_ClaudeCodeManager/folderManager';
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

function getProjectPath(projectId: string): string {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT path FROM projects WHERE id = ?').get(projectId) as
      { path: string } | undefined;
    return row?.path || '';
  } catch {
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { runId, decisionIds } = body as { runId: string; decisionIds: string[] };

    if (!runId || !Array.isArray(decisionIds) || decisionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing runId or decisionIds' },
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
    const projectPath = getProjectPath(run.project_id);

    if (!projectPath) {
      return NextResponse.json(
        { success: false, error: 'Project path not found' },
        { status: 404 }
      );
    }

    // Get decisions and ratings
    const decisions = extractDecisions(run, goal);
    let ratings: Record<string, { rating: number; comment?: string }> = {};
    try {
      const db = getDatabase();
      const row = db.prepare('SELECT decision_ratings FROM conductor_runs WHERE id = ?').get(runId) as
        { decision_ratings: string | null } | undefined;
      if (row?.decision_ratings) {
        ratings = JSON.parse(row.decision_ratings);
      }
    } catch { /* empty */ }

    const createdFiles: string[] = [];
    const errors: string[] = [];

    for (const decisionId of decisionIds) {
      const decision = decisions.find((d) => d.id === decisionId);
      if (!decision) {
        errors.push(`Decision ${decisionId} not found`);
        continue;
      }

      const ratingData = ratings[decisionId];
      const rating = ratingData?.rating ?? 2;
      const comment = ratingData?.comment;

      const content = buildRedesignCommand(decision, rating, comment, {
        goalTitle: goal.title,
        goalDescription: goal.description,
        projectPath,
      });

      const shortId = `${runId.slice(0, 8)}-${decisionId}`;
      const result = createRequirement(projectPath, `redesign-${shortId}`, content, true);

      if (result.success && result.filePath) {
        createdFiles.push(result.filePath);
      } else {
        errors.push(result.error || `Failed to create redesign for ${decisionId}`);
      }
    }

    return NextResponse.json({
      success: true,
      createdFiles,
      count: createdFiles.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[conductor/report/redesign] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
