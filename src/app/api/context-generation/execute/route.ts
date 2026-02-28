/**
 * API Route: Execute Context Generation
 *
 * POST /api/context-generation/execute
 * Starts CLI execution to analyze codebase and generate contexts
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectDb } from '@/lib/project_database';
import { startExecution } from '@/lib/claude-terminal/cli-service';
import { buildContextGenerationPrompt } from '@/app/features/Context/lib/contextGenerationPrompt';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { contextGroupRepository } from '@/app/db/repositories/context-group.repository';
import { contextGroupRelationshipRepository } from '@/app/db/repositories/context-group-relationship.repository';

interface ExecuteRequestBody {
  projectId: string;
  projectPath?: string; // Optional — DB path is used as source of truth
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json() as ExecuteRequestBody;
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get the project info — DB path is the source of truth
    const project = projectDb.projects.get(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectPath = project.path;
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project has no path configured' },
        { status: 400 }
      );
    }

    // Snapshot existing data IDs for deferred cleanup after successful generation.
    // We do NOT delete here — if the CLI fails, user data must survive.
    // Old data is cleaned up by /api/context-generation/cleanup after success.
    let previousDataIds: { contextIds: string[]; groupIds: string[]; relationshipIds: string[] } = {
      contextIds: [],
      groupIds: [],
      relationshipIds: [],
    };
    try {
      const existingContexts = contextRepository.getContextsByProject(projectId);
      const existingGroups = contextGroupRepository.getGroupsByProject(projectId);
      const existingRelationships = contextGroupRelationshipRepository.getByProject(projectId);
      previousDataIds = {
        contextIds: existingContexts.map(c => c.id),
        groupIds: existingGroups.map(g => g.id),
        relationshipIds: existingRelationships.map(r => r.id),
      };
      logger.info('[API] Snapshot of existing data for deferred cleanup:', {
        projectId,
        contexts: previousDataIds.contextIds.length,
        groups: previousDataIds.groupIds.length,
        relationships: previousDataIds.relationshipIds.length,
      });
    } catch (snapshotError) {
      logger.warn('[API] Failed to snapshot existing data (continuing anyway):', { snapshotError });
    }

    // Build the context generation prompt
    const prompt = await buildContextGenerationPrompt({
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
      previousDataIds,
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
