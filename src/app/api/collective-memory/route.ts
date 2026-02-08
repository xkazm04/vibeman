/**
 * Collective Memory API
 * GET: Retrieve memories, stats, or relevant knowledge for a task
 * POST: Record a new learning or resolve an application
 */

import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { collectiveMemoryDb } from '@/app/db';
import {
  recordTaskLearning,
  getRelevantKnowledge,
  getCollectiveStats,
} from '@/lib/collective-memory/collectiveMemoryService';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const action = searchParams.get('action');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    switch (action) {
      case 'stats': {
        const stats = getCollectiveStats(projectId);
        return NextResponse.json({ success: true, stats });
      }

      case 'relevant': {
        const requirementName = searchParams.get('requirementName') || '';
        const filePatternsRaw = searchParams.get('filePatterns');
        const filePatterns = filePatternsRaw ? JSON.parse(filePatternsRaw) : [];
        const limit = parseInt(searchParams.get('limit') || '5', 10);

        const knowledge = getRelevantKnowledge({
          projectId,
          requirementName,
          filePatterns,
          limit,
        });
        return NextResponse.json({ success: true, memories: knowledge });
      }

      case 'trends': {
        const days = parseInt(searchParams.get('days') || '30', 10);
        const trends = collectiveMemoryDb.getEffectivenessTrends(projectId, days);
        return NextResponse.json({ success: true, trends });
      }

      case 'applications': {
        const memoryId = searchParams.get('memoryId');
        if (!memoryId) {
          return NextResponse.json({ error: 'memoryId required for applications' }, { status: 400 });
        }
        const apps = collectiveMemoryDb.getApplicationsByMemory(memoryId);
        return NextResponse.json({ success: true, applications: apps });
      }

      default: {
        // Default: list memories by project
        const type = searchParams.get('type') as import('@/app/db').CollectiveMemoryType | null;
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        const memories = type
          ? collectiveMemoryDb.getByType(projectId, type, limit)
          : collectiveMemoryDb.getByProject(projectId, limit);

        return NextResponse.json({ success: true, memories });
      }
    }
  } catch (error) {
    console.error('[CollectiveMemory] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'record-learning': {
        const { projectId, sessionId, taskId, requirementName, success, filesChanged, errorMessage, toolCounts, durationMs } = body;
        if (!projectId || !requirementName || success === undefined) {
          return NextResponse.json(
            { error: 'projectId, requirementName, and success are required' },
            { status: 400 }
          );
        }
        const entry = recordTaskLearning({
          projectId, sessionId, taskId, requirementName,
          success, filesChanged, errorMessage, toolCounts, durationMs,
        });
        return NextResponse.json({ success: true, entry });
      }

      case 'apply': {
        const { memoryId, projectId, sessionId, taskId, requirementName } = body;
        if (!memoryId || !projectId) {
          return NextResponse.json({ error: 'memoryId and projectId required' }, { status: 400 });
        }
        const appId = `cma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const application = collectiveMemoryDb.createApplication({
          id: appId,
          memory_id: memoryId,
          project_id: projectId,
          session_id: sessionId,
          task_id: taskId,
          requirement_name: requirementName,
        });
        collectiveMemoryDb.updateLastApplied(memoryId);
        return NextResponse.json({ success: true, application });
      }

      case 'resolve-application': {
        const { applicationId, outcome, details } = body;
        if (!applicationId || !outcome) {
          return NextResponse.json({ error: 'applicationId and outcome required' }, { status: 400 });
        }
        collectiveMemoryDb.resolveApplication(applicationId, outcome, details);
        return NextResponse.json({ success: true });
      }

      case 'delete': {
        const { memoryId } = body;
        if (!memoryId) {
          return NextResponse.json({ error: 'memoryId required' }, { status: 400 });
        }
        const deleted = collectiveMemoryDb.delete(memoryId);
        return NextResponse.json({ success: true, deleted });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('[CollectiveMemory] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGET, '/api/collective-memory');
export const POST = withObservability(handlePOST, '/api/collective-memory');
