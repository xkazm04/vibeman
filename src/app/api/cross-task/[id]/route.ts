/**
 * Cross Task Plan Details API Route
 * GET: Get plan details by ID
 * DELETE: Delete a plan
 * PATCH: Start analysis (mark as running)
 */

import { NextResponse } from 'next/server';
import { crossTaskPlanDb } from '@/app/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const plan = crossTaskPlanDb.getById(id);

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Parse project_ids JSON
    const parsedPlan = {
      ...plan,
      project_ids: JSON.parse(plan.project_ids),
    };

    return NextResponse.json({
      success: true,
      plan: parsedPlan,
    });
  } catch (error) {
    console.error('Error fetching cross-task plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cross-task plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const plan = crossTaskPlanDb.getById(id);

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting running plans
    if (plan.status === 'running') {
      return NextResponse.json(
        { error: 'Cannot delete a running analysis' },
        { status: 400 }
      );
    }

    const deleted = crossTaskPlanDb.delete(id);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Plan deleted successfully' : 'Failed to delete plan',
    });
  } catch (error) {
    console.error('Error deleting cross-task plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete cross-task plan' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, executionId } = body;

    const plan = crossTaskPlanDb.getById(id);

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    if (action === 'start') {
      if (plan.status !== 'pending') {
        return NextResponse.json(
          { error: 'Can only start pending plans' },
          { status: 400 }
        );
      }

      const updated = crossTaskPlanDb.startAnalysis(id, executionId);

      return NextResponse.json({
        success: true,
        plan: updated ? { ...updated, project_ids: JSON.parse(updated.project_ids) } : null,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating cross-task plan:', error);
    return NextResponse.json(
      { error: 'Failed to update cross-task plan' },
      { status: 500 }
    );
  }
}
