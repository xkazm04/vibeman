/**
 * Architecture Analysis API
 * POST - Trigger new architecture analysis
 * GET - Get analysis status and history
 */

import { NextRequest } from 'next/server';
import { architectureAnalysisAgent } from '@/lib/architecture/analysisAgent';
import { architectureAnalysisDb } from '@/app/db';
import type { AnalysisTriggerType } from '@/app/db/models/cross-project-architecture.types';
import {
  successResponse,
  validationError,
  notFoundError,
  handleApiError,
  createApiErrorResponse,
  ApiErrorCode,
} from '@/lib/api-errors';

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

    if (!scope) {
      return validationError('Scope is required (project or workspace)');
    }

    if (scope === 'workspace' && !projects?.length) {
      return validationError('Projects array is required for workspace analysis');
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;

    if (scope === 'workspace') {
      const result = await architectureAnalysisAgent.analyzeWorkspace({
        workspaceId: workspaceId || null,
        projects: projects!,
        triggerType,
        baseUrl,
      });

      if (!result.success) {
        return createApiErrorResponse(
          ApiErrorCode.RESOURCE_CONFLICT,
          result.error || 'Analysis already in progress',
          { details: { analysisId: result.analysisId } }
        );
      }

      return successResponse({
        analysisId: result.analysisId,
        promptContent: result.promptContent,
      });
    } else {
      if (!projectId || !projects?.length) {
        return validationError('projectId and projects array required for project analysis');
      }

      const newProject = projects.find(p => p.id === projectId);
      if (!newProject) {
        return validationError('New project not found in projects array');
      }

      const existingProjects = projects.filter(p => p.id !== projectId);

      const result = await architectureAnalysisAgent.analyzeNewProject({
        newProject,
        existingProjects,
        workspaceId,
        baseUrl,
      });

      if (!result.success) {
        return createApiErrorResponse(
          ApiErrorCode.RESOURCE_CONFLICT,
          result.error || 'Analysis already in progress',
          { details: { analysisId: result.analysisId } }
        );
      }

      return successResponse({
        analysisId: result.analysisId,
        promptContent: result.promptContent,
      });
    }
  } catch (error) {
    return handleApiError(error, 'architecture analysis');
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

    if (analysisId) {
      const analysis = architectureAnalysisDb.getById(analysisId);
      if (!analysis) {
        return notFoundError('Analysis');
      }
      return successResponse({ analysis });
    }

    if (workspaceId !== null) {
      const wsId = workspaceId || null;
      const running = architectureAnalysisDb.getRunning('workspace', wsId);
      const latest = architectureAnalysisDb.getLatestCompleted('workspace', wsId);
      const history = architectureAnalysisDb.getHistory('workspace', wsId, 10);

      return successResponse({
        isRunning: !!running,
        running,
        latest,
        history,
      });
    }

    if (projectId) {
      const running = architectureAnalysisDb.getRunning('project', projectId);
      const latest = architectureAnalysisDb.getLatestCompleted('project', projectId);
      const history = architectureAnalysisDb.getHistory('project', projectId, 10);

      return successResponse({
        isRunning: !!running,
        running,
        latest,
        history,
      });
    }

    return validationError('analysisId, workspaceId, or projectId required');
  } catch (error) {
    return handleApiError(error, 'get architecture analysis');
  }
}
