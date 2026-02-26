/**
 * API Route: Autonomous Agent Mode
 *
 * GET  /api/annette/autonomous?projectId=xxx  - Get current agent status
 * POST /api/annette/autonomous                - Start/pause/resume/cancel
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  startGoal,
  pauseGoal,
  resumeGoal,
  cancelGoal,
  getAgentStatus,
} from '@/lib/annette/autonomousAgent';
import { agentDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const status = getAgentStatus(projectId);
    if (!status) {
      return NextResponse.json({ active: false, goal: null, steps: [], history: [] });
    }

    const history = agentDb.goals.getByProject(projectId, 10);

    return NextResponse.json({
      active: status.isRunning,
      goal: {
        id: status.goal.id,
        objective: status.goal.objective,
        status: status.goal.status,
        totalSteps: status.goal.total_steps,
        completedSteps: status.goal.completed_steps,
        failedSteps: status.goal.failed_steps,
        resultSummary: status.goal.result_summary,
        errorMessage: status.goal.error_message,
        startedAt: status.goal.started_at,
        completedAt: status.goal.completed_at,
        createdAt: status.goal.created_at,
      },
      steps: status.steps.map(s => ({
        id: s.id,
        orderIndex: s.order_index,
        title: s.title,
        description: s.description,
        toolName: s.tool_name,
        status: s.status,
        result: s.result ? s.result.substring(0, 500) : null,
        errorMessage: s.error_message,
        startedAt: s.started_at,
        completedAt: s.completed_at,
      })),
      history: history.map(g => ({
        id: g.id,
        objective: g.objective,
        status: g.status,
        completedSteps: g.completed_steps,
        totalSteps: g.total_steps,
        resultSummary: g.result_summary,
        createdAt: g.created_at,
        completedAt: g.completed_at,
      })),
    });
  } catch (error) {
    logger.error('[API] Autonomous GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath, action, objective } = body as {
      projectId: string;
      projectPath?: string;
      action: 'start' | 'pause' | 'resume' | 'cancel';
      objective?: string;
    };

    if (!projectId || !action) {
      return NextResponse.json({ error: 'projectId and action are required' }, { status: 400 });
    }

    switch (action) {
      case 'start': {
        if (!objective) {
          return NextResponse.json({ error: 'objective is required for start action' }, { status: 400 });
        }
        const goal = await startGoal({ projectId, projectPath, objective });
        logger.info('[Agent] Goal started', { goalId: goal.id, objective });
        return NextResponse.json({ success: true, goalId: goal.id, status: goal.status });
      }

      case 'pause': {
        const goal = pauseGoal(projectId);
        return NextResponse.json({ success: true, goalId: goal?.id, status: goal?.status || 'not_found' });
      }

      case 'resume': {
        const goal = await resumeGoal(projectId, projectPath);
        if (!goal) {
          return NextResponse.json({ error: 'No paused goal found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, goalId: goal.id, status: goal.status });
      }

      case 'cancel': {
        const goal = cancelGoal(projectId);
        return NextResponse.json({ success: true, goalId: goal?.id, status: goal?.status || 'not_found' });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    logger.error('[API] Autonomous POST error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
