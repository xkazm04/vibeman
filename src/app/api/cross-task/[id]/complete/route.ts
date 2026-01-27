/**
 * Cross Task Complete Callback API Route
 * POST: Callback from Claude Code CLI to submit analysis results
 */

import { NextResponse } from 'next/server';
import { crossTaskPlanDb } from '@/app/db';
import { signalCollector } from '@/lib/brain/signalCollector';

interface CompleteRequest {
  requirement_summary: string;
  current_flow_analysis: string;
  plans: Array<{
    number: 1 | 2 | 3;
    title: string;
    content: string;
  }>;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: CompleteRequest = await request.json();

    const plan = crossTaskPlanDb.getById(id);

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Allow completion from pending or running status
    if (plan.status !== 'pending' && plan.status !== 'running') {
      return NextResponse.json(
        { error: `Cannot complete plan with status: ${plan.status}` },
        { status: 400 }
      );
    }

    // Validate plans array
    if (!body.plans || body.plans.length !== 3) {
      return NextResponse.json(
        { error: 'Exactly 3 plans are required' },
        { status: 400 }
      );
    }

    // Extract plans by number
    const plan1 = body.plans.find((p) => p.number === 1);
    const plan2 = body.plans.find((p) => p.number === 2);
    const plan3 = body.plans.find((p) => p.number === 3);

    if (!plan1 || !plan2 || !plan3) {
      return NextResponse.json(
        { error: 'Plans must include numbers 1, 2, and 3' },
        { status: 400 }
      );
    }

    // Calculate execution time
    const startTime = plan.started_at ? new Date(plan.started_at).getTime() : Date.now();
    const executionTimeMs = Date.now() - startTime;

    // Complete the plan with results
    const updated = crossTaskPlanDb.completePlan(id, {
      requirement_summary: body.requirement_summary,
      current_flow_analysis: body.current_flow_analysis,
      plan_option_1: plan1.content,
      plan_option_1_title: plan1.title,
      plan_option_2: plan2.content,
      plan_option_2_title: plan2.title,
      plan_option_3: plan3.content,
      plan_option_3_title: plan3.title,
    });

    // Emit Brain signal for cross_task_analysis
    const projectIds = JSON.parse(plan.project_ids) as string[];
    if (projectIds.length > 0) {
      signalCollector.recordCrossTaskAnalysis(projectIds[0], {
        planId: id,
        workspaceId: plan.workspace_id,
        projectIds,
        requirement: plan.requirement,
        requirementSummary: body.requirement_summary,
        plansGenerated: 3,
        success: true,
        executionTimeMs,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Analysis completed successfully',
      planId: id,
    });
  } catch (error) {
    console.error('Error completing cross-task plan:', error);

    // Try to mark the plan as failed
    try {
      const { id } = await params;
      crossTaskPlanDb.failPlan(id, error instanceof Error ? error.message : 'Unknown error');
    } catch {
      // Ignore errors during failure marking
    }

    return NextResponse.json(
      { error: 'Failed to complete cross-task plan' },
      { status: 500 }
    );
  }
}
