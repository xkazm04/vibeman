/**
 * Architecture Analysis API
 * POST - Trigger new architecture analysis
 * GET - Get analysis status and history
 */

import { NextRequest, NextResponse } from 'next/server';
import { architectureAnalysisAgent } from '@/lib/architecture/analysisAgent';
import { architectureAnalysisDb } from '@/app/db';
import type { AnalysisTriggerType } from '@/app/db/models/cross-project-architecture.types';

interface AnalyzeRequestBody {
  scope: 'project' | 'workspace';
  workspaceId?: string | null;
  projectId?: string;
  projects?: Array<{
    id: string;
    name: string;
    path: string;
    framework?: string;
    tier?: 'frontend' | 'backend' | 'external' | 'shared';
  }>;
  triggerType?: AnalysisTriggerType;
}

/**
 * POST /api/architecture/analyze
 * Trigger a new architecture analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;
    const { scope, workspaceId, projectId, projects, triggerType = 'manual' } = body;

    // Validate request
    if (!scope) {
      return NextResponse.json(
        { error: 'Scope is required (project or workspace)' },
        { status: 400 }
      );
    }

    if (scope === 'workspace' && !projects?.length) {
      return NextResponse.json(
        { error: 'Projects array is required for workspace analysis' },
        { status: 400 }
      );
    }

    // Get base URL for callback
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;

    if (scope === 'workspace') {
      // Workspace-level analysis
      const result = await architectureAnalysisAgent.analyzeWorkspace({
        workspaceId: workspaceId || null,
        projects: projects!,
        triggerType,
        baseUrl,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error, analysisId: result.analysisId },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        analysisId: result.analysisId,
        promptContent: result.promptContent,
      });
    } else {
      // Single project analysis (onboarding)
      if (!projectId || !projects?.length) {
        return NextResponse.json(
          { error: 'projectId and projects array required for project analysis' },
          { status: 400 }
        );
      }

      const newProject = projects.find(p => p.id === projectId);
      if (!newProject) {
        return NextResponse.json(
          { error: 'New project not found in projects array' },
          { status: 400 }
        );
      }

      const existingProjects = projects.filter(p => p.id !== projectId);

      const result = await architectureAnalysisAgent.analyzeNewProject({
        newProject,
        existingProjects,
        workspaceId,
        baseUrl,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error, analysisId: result.analysisId },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        analysisId: result.analysisId,
        promptContent: result.promptContent,
      });
    }
  } catch (error) {
    console.error('Architecture analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/architecture/analyze
 * Get analysis status and history
 * Query params: analysisId | workspaceId | projectId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('analysisId');
    const workspaceId = searchParams.get('workspaceId');
    const projectId = searchParams.get('projectId');

    // Get specific analysis
    if (analysisId) {
      const analysis = architectureAnalysisDb.getById(analysisId);
      if (!analysis) {
        return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
      }
      return NextResponse.json({ analysis });
    }

    // Get workspace analysis status and history
    if (workspaceId !== null) {
      const wsId = workspaceId || null; // Convert empty string to null
      const running = architectureAnalysisDb.getRunning('workspace', wsId);
      const latest = architectureAnalysisDb.getLatestCompleted('workspace', wsId);
      const history = architectureAnalysisDb.getHistory('workspace', wsId, 10);

      return NextResponse.json({
        isRunning: !!running,
        running,
        latest,
        history,
      });
    }

    // Get project analysis status and history
    if (projectId) {
      const running = architectureAnalysisDb.getRunning('project', projectId);
      const latest = architectureAnalysisDb.getLatestCompleted('project', projectId);
      const history = architectureAnalysisDb.getHistory('project', projectId, 10);

      return NextResponse.json({
        isRunning: !!running,
        running,
        latest,
        history,
      });
    }

    return NextResponse.json(
      { error: 'analysisId, workspaceId, or projectId required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Get analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get analysis' },
      { status: 500 }
    );
  }
}
