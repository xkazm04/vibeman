/**
 * Cross Task Select Plan API Route
 * POST: User selects one of the 3 plan options
 */

import { NextResponse } from 'next/server';
import { crossTaskPlanDb } from '@/app/db';
import { signalCollector } from '@/lib/brain/signalCollector';

interface SelectRequest {
  planNumber: 1 | 2 | 3;
  notes?: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: SelectRequest = await request.json();
    const { planNumber, notes } = body;

    // Validate plan number
    if (![1, 2, 3].includes(planNumber)) {
      return NextResponse.json(
        { error: 'Plan number must be 1, 2, or 3' },
        { status: 400 }
      );
    }

    const plan = crossTaskPlanDb.getById(id);

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Only allow selecting from completed plans
    if (plan.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only select from completed plans' },
        { status: 400 }
      );
    }

    // Check that the selected plan has content
    const planContent = plan[`plan_option_${planNumber}` as keyof typeof plan];
    if (!planContent) {
      return NextResponse.json(
        { error: `Plan option ${planNumber} has no content` },
        { status: 400 }
      );
    }

    // Update the selection
    const updated = crossTaskPlanDb.selectPlan(id, planNumber, notes);

    // Emit Brain signal for cross_task_selection
    const projectIds = JSON.parse(plan.project_ids) as string[];
    const planTitle = plan[`plan_option_${planNumber}_title` as keyof typeof plan] as string || `Plan ${planNumber}`;

    if (projectIds.length > 0) {
      signalCollector.recordCrossTaskSelection(projectIds[0], {
        planId: id,
        selectedPlan: planNumber,
        planTitle,
        userNotes: notes || null,
        projectIds,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Plan ${planNumber} selected successfully`,
      plan: updated ? {
        ...updated,
        project_ids: JSON.parse(updated.project_ids),
      } : null,
    });
  } catch (error) {
    console.error('Error selecting cross-task plan:', error);
    return NextResponse.json(
      { error: 'Failed to select plan' },
      { status: 500 }
    );
  }
}
