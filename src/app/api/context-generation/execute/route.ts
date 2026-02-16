/**
 * API Route: Execute Context Generation
 *
 * POST /api/context-generation/execute
 * Starts CLI execution to analyze codebase and generate contexts
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectServiceDb } from '@/lib/projectServiceDb';
import { startExecution } from '@/lib/claude-terminal/cli-service';
import { buildContextGenerationPrompt } from '@/app/features/Context/lib/contextGenerationPrompt';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { contextGroupRepository } from '@/app/db/repositories/context-group.repository';

interface ExecuteRequestBody {
  projectId: string;
  projectPath: string;
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json() as ExecuteRequestBody;
    const { projectId, projectPath } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    // Get the project info
    const project = await projectServiceDb.getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Pre-cleanup: Delete existing contexts and groups before regeneration
    // This prevents the CLI from needing to handle cleanup (which causes infinite loops)
    try {
      const deletedContexts = contextRepository.deleteAllContextsByProject(projectId);
      const existingGroups = contextGroupRepository.getGroupsByProject(projectId);
      for (const group of existingGroups) {
        contextGroupRepository.deleteGroup(group.id);
      }
      logger.info('[API] Pre-cleanup completed:', {
        projectId,
        deletedContexts,
        deletedGroups: existingGroups.length,
      });
    } catch (cleanupError) {
      logger.warn('[API] Pre-cleanup failed (continuing anyway):', { cleanupError });
    }

    // Build the context generation prompt
    const prompt = buildContextGenerationPrompt({
      projectId,
      projectName: project.name,
      projectPath,
      projectType: project.type || undefined,
    });

    logger.info('[API] Starting context generation CLI execution:', {
      projectId,
      projectName: project.name,
      projectPath,
    });

    // Start the CLI execution
    let executionId: string;
    try {
      executionId = startExecution(projectPath, prompt);
    } catch (execError) {
      logger.error('[API] Failed to start CLI execution:', { execError });
      return NextResponse.json(
        { error: `Failed to start CLI: ${execError instanceof Error ? execError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    const streamUrl = `/api/claude-terminal/stream?executionId=${executionId}`;

    logger.info('[API] Context generation execution started:', {
      projectId,
      executionId,
      streamUrl,
    });

    return NextResponse.json({
      success: true,
      executionId,
      streamUrl,
    });
  } catch (error) {
    logger.error('[API] Context generation execute error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/context-generation/execute');
