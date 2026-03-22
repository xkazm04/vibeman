/**
 * Auto-Triage Generator API
 * POST: Generate a .claude/commands/ requirement file for automated idea triage
 */
import { NextRequest, NextResponse } from 'next/server';
import { buildAutoTriagePrompt } from '@/lib/triage/autoTriagePromptBuilder';
import { projectDb } from '@/lib/project_database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, maxEffort } = body;

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 });
    }

    const effort = parseInt(maxEffort, 10);
    if (isNaN(effort) || effort < 1 || effort > 9) {
      return NextResponse.json({ success: false, error: 'maxEffort must be 1-9' }, { status: 400 });
    }

    // Look up project from the projects database (separate from main app DB)
    const project = projectDb.getProject(projectId);

    if (!project?.path) {
      return NextResponse.json({ success: false, error: 'Project not found or no path' }, { status: 404 });
    }

    const projectPath = project.path;
    const promptContent = buildAutoTriagePrompt({ projectId, projectPath, maxEffort: effort });

    // Write the requirement file
    const timestamp = Date.now();
    const requirementName = `auto-triage-${timestamp}`;
    const fs = await import('fs');
    const path = await import('path');

    const commandsDir = path.join(projectPath, '.claude', 'commands');
    fs.mkdirSync(commandsDir, { recursive: true });
    fs.writeFileSync(path.join(commandsDir, `${requirementName}.md`), promptContent, 'utf-8');

    // Count matching ideas for response (ideas are in the main app DB)
    const { getDatabase } = await import('@/app/db/connection');
    const db = getDatabase();
    const ideaCount = db.prepare(
      `SELECT COUNT(*) as count FROM ideas WHERE project_id = ? AND status = 'pending' AND effort IS NOT NULL AND effort <= ?`
    ).get(projectId, effort) as { count: number } | undefined;

    return NextResponse.json({
      success: true,
      data: {
        requirementName,
        ideaCount: ideaCount?.count ?? 0,
        maxEffort: effort,
      },
    });
  } catch (err) {
    console.error('[Auto-Triage] Generation error:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
