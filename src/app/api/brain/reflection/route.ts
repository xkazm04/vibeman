/**
 * API Route: Brain Reflection
 *
 * GET /api/brain/reflection - Get reflection status
 * POST /api/brain/reflection - Trigger a new reflection
 */

import { NextRequest, NextResponse } from 'next/server';
import { reflectionAgent } from '@/lib/brain/reflectionAgent';
import { brainReflectionDb, brainInsightDb } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';
import type { ReflectionTriggerType } from '@/app/db/models/brain.types';
import { dbInsightToLearning } from '@/app/db/repositories/brain-insight.repository';
import { startReflection, startGlobalReflection } from '@/lib/brain/brainService';

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
    const mode = searchParams.get('mode');

    // History mode: return past reflections with stats
    if (mode === 'history') {
      const projectId = searchParams.get('projectId');
      const limit = parseInt(searchParams.get('limit') || '20', 10);

      if (!projectId) {
        return NextResponse.json(
          { success: false, error: 'projectId is required for history mode' },
          { status: 400 }
        );
      }

      const reflections = brainReflectionDb.getByProject(projectId, limit);

      // Batch-fetch all insights for these reflections in one query (avoids N+1)
      const reflectionIds = reflections.map(r => r.id);
      const insightsByReflection = brainInsightDb.getByReflectionIds(reflectionIds);

      // Compute stats for each reflection
      const history = reflections.map((r) => {
        const insightRows = insightsByReflection.get(r.id) || [];
        const insights = insightRows.map(dbInsightToLearning);

        let sectionsUpdated: string[] = [];
        try {
          sectionsUpdated = r.guide_sections_updated ? JSON.parse(r.guide_sections_updated) : [];
        } catch { /* malformed JSON */ }

        const durationMs = r.started_at && r.completed_at
          ? new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()
          : null;

        return {
          id: r.id,
          status: r.status,
          triggerType: r.trigger_type,
          directionsAnalyzed: r.directions_analyzed,
          outcomesAnalyzed: r.outcomes_analyzed,
          signalsAnalyzed: r.signals_analyzed,
          insightCount: insights.length,
          insights,
          sectionsUpdated,
          durationMs,
          errorMessage: r.error_message,
          startedAt: r.started_at,
          completedAt: r.completed_at,
          createdAt: r.created_at,
        };
      });

      // Aggregate stats
      const completed = history.filter(h => h.status === 'completed');
      const totalInsights = completed.reduce((sum, h) => sum + h.insightCount, 0);
      const totalDuration = completed.reduce((sum, h) => sum + (h.durationMs || 0), 0);
      const avgInsights = completed.length > 0 ? totalInsights / completed.length : 0;
      const avgDuration = completed.length > 0 ? totalDuration / completed.length : 0;

      return NextResponse.json({
        success: true,
        history,
        aggregates: {
          totalReflections: history.length,
          completedReflections: completed.length,
          failedReflections: history.filter(h => h.status === 'failed').length,
          totalInsights,
          avgInsightsPerReflection: Math.round(avgInsights * 10) / 10,
          totalDurationMs: totalDuration,
          avgDurationMs: Math.round(avgDuration),
        },
      });
    }

    // Global reflection status
    if (scope === 'global') {
      const globalStatus = reflectionAgent.getGlobalStatus();

      return NextResponse.json({
        success: true,
        scope: 'global',
        ...globalStatus,
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

    return NextResponse.json({
      success: true,
      scope: 'project',
      ...status,
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

      const result = await startGlobalReflection({ projects, workspacePath });

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
        promptContent: result.promptContent,
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

    const result = await startReflection({
      projectId,
      projectName,
      projectPath,
      triggerType: trigger,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          reflectionId: result.reflectionId,
        },
        { status: result.reflectionId ? 409 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reflection started',
      reflectionId: result.reflectionId,
      promptContent: result.promptContent,
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
