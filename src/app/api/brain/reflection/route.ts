/**
 * API Route: Brain Reflection
 *
 * GET /api/brain/reflection - Get reflection status
 * POST /api/brain/reflection - Trigger a new reflection
 */

import { NextRequest, NextResponse } from 'next/server';
import { reflectionAgent } from '@/lib/brain/reflectionAgent';
import { withObservability } from '@/lib/observability/middleware';
import type { ReflectionTriggerType } from '@/app/db/models/brain.types';

/**
 * GET /api/brain/reflection
 * Get reflection status for a project
 *
 * Query params:
 * - projectId: string (required)
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'project';

    // Global reflection status
    if (scope === 'global') {
      const globalStatus = reflectionAgent.getGlobalStatus();

      let requirementName: string | null = null;
      if (globalStatus.runningReflection) {
        requirementName = `brain-reflection-${globalStatus.runningReflection.id}.md`;
      }

      return NextResponse.json({
        success: true,
        scope: 'global',
        ...globalStatus,
        requirementName,
      });
    }

    // Per-project reflection status
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const status = reflectionAgent.getStatus(projectId);
    const shouldTrigger = reflectionAgent.shouldTrigger(projectId);

    // Include requirement filename for running reflections so UI can connect CLI
    let requirementName: string | null = null;
    if (status.runningReflection) {
      requirementName = `brain-reflection-${status.runningReflection.id}.md`;
    }

    return NextResponse.json({
      success: true,
      scope: 'project',
      ...status,
      requirementName,
      shouldTrigger: shouldTrigger.shouldTrigger,
      triggerReason: shouldTrigger.reason,
    });
  } catch (error) {
    console.error('[API] Brain reflection GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brain/reflection
 * Trigger a new reflection session
 *
 * Body:
 * - projectId: string (required for project scope)
 * - projectName: string (required for project scope)
 * - projectPath: string (required for project scope)
 * - triggerType?: 'manual' | 'threshold' | 'scheduled'
 * - scope?: 'project' | 'global'
 * - projects?: Array<{id, name, path}> (required for global scope)
 * - workspacePath?: string (required for global scope)
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { scope } = body;

    // Global reflection mode
    if (scope === 'global') {
      const { projects, workspacePath } = body;

      if (!Array.isArray(projects) || projects.length === 0 || !workspacePath) {
        return NextResponse.json(
          { success: false, error: 'projects array and workspacePath are required for global scope' },
          { status: 400 }
        );
      }

      const result = await reflectionAgent.startGlobalReflection(projects, workspacePath);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error, reflectionId: result.reflectionId },
          { status: result.reflectionId ? 409 : 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Global reflection started',
        reflectionId: result.reflectionId,
        requirementPath: result.requirementPath,
        scope: 'global',
      });
    }

    // Per-project reflection (default)
    const { projectId, projectName, projectPath, triggerType } = body;

    if (!projectId || !projectName || !projectPath) {
      return NextResponse.json(
        { success: false, error: 'projectId, projectName, and projectPath are required' },
        { status: 400 }
      );
    }

    // Validate trigger type
    const validTriggerTypes: ReflectionTriggerType[] = ['manual', 'threshold', 'scheduled'];
    const trigger: ReflectionTriggerType = validTriggerTypes.includes(triggerType)
      ? triggerType
      : 'manual';

    // Start reflection (async - gathers git history)
    const result = await reflectionAgent.startReflection(
      projectId,
      projectName,
      projectPath,
      trigger
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          reflectionId: result.reflectionId,
        },
        { status: result.reflectionId ? 409 : 400 } // 409 if already running
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reflection started',
      reflectionId: result.reflectionId,
      requirementPath: result.requirementPath,
      scope: 'project',
    });
  } catch (error) {
    console.error('[API] Brain reflection POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/brain/reflection
 * Cancel/force-stop a running reflection
 *
 * Body:
 * - projectId: string (required)
 * - reflectionId: string (optional - cancel specific, otherwise cancel any running)
 */
async function handlePatch(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, reflectionId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // If reflectionId provided, cancel that specific one; otherwise cancel any running
    let targetId = reflectionId;
    if (!targetId) {
      const status = reflectionAgent.getStatus(projectId);
      if (!status.runningReflection) {
        return NextResponse.json(
          { success: false, error: 'No running reflection to cancel' },
          { status: 404 }
        );
      }
      targetId = status.runningReflection.id;
    }

    const success = reflectionAgent.failReflection(targetId, 'Cancelled by user');

    return NextResponse.json({
      success,
      message: success ? 'Reflection cancelled' : 'Failed to cancel reflection',
      reflectionId: targetId,
    });
  } catch (error) {
    console.error('[API] Brain reflection PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/brain/reflection');
export const POST = withObservability(handlePost, '/api/brain/reflection');
export const PATCH = withObservability(handlePatch, '/api/brain/reflection');
