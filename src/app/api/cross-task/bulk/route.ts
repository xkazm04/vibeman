/**
 * Cross Task Bulk Operations API Route
 * DELETE: Bulk delete multiple plans
 */

import { NextResponse } from 'next/server';
import { crossTaskPlanDb } from '@/app/db';

interface BulkDeleteRequest {
  planIds: string[];
}

export async function DELETE(request: Request) {
  try {
    const body: BulkDeleteRequest = await request.json();
    const { planIds } = body;

    if (!planIds || planIds.length === 0) {
      return NextResponse.json(
        { error: 'No plan IDs provided' },
        { status: 400 }
      );
    }

    // Filter out any running plans
    const plansToDelete: string[] = [];
    const skippedRunning: string[] = [];

    for (const id of planIds) {
      const plan = crossTaskPlanDb.getById(id);
      if (plan) {
        if (plan.status === 'running') {
          skippedRunning.push(id);
        } else {
          plansToDelete.push(id);
        }
      }
    }

    // Delete the filtered plans
    const deleted = crossTaskPlanDb.deleteMany(plansToDelete);

    return NextResponse.json({
      success: true,
      deleted,
      requested: planIds.length,
      skippedRunning: skippedRunning.length,
      message: skippedRunning.length > 0
        ? `Deleted ${deleted} plans. ${skippedRunning.length} running plan(s) were skipped.`
        : `Deleted ${deleted} plans.`,
    });
  } catch (error) {
    console.error('Error bulk deleting cross-task plans:', error);
    return NextResponse.json(
      { error: 'Failed to bulk delete plans' },
      { status: 500 }
    );
  }
}
