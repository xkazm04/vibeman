/**
 * API Route: ROI Simulator - Refactorings
 * CRUD operations for refactoring economics
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  refactoringEconomicsDb,
  type DbRefactoringEconomics,
} from '@/app/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const refactorings = refactoringEconomicsDb.getWithROIDetails(projectId);

    return NextResponse.json({
      success: true,
      refactorings,
    });
  } catch (error) {
    logger.error('Failed to get refactorings:', { data: error });
    return NextResponse.json(
      { error: 'Failed to get refactorings', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, ...data } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    if (!data.title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    const refactoring = refactoringEconomicsDb.create({
      project_id,
      source_type: data.source_type || 'manual',
      source_id: data.source_id || null,
      title: data.title,
      description: data.description || null,
      category: data.category || 'code_quality',
      estimated_hours: data.estimated_hours || 0,
      hourly_rate: data.hourly_rate || 100,
      opportunity_cost_factor: data.opportunity_cost_factor ?? 0.5,
      risk_premium: data.risk_premium ?? 0.1,
      learning_overhead: data.learning_overhead ?? 0.2,
      testing_overhead: data.testing_overhead ?? 0.3,
      velocity_improvement: data.velocity_improvement || 0,
      maintainability_score_before: data.maintainability_score_before || 50,
      maintainability_score_after: data.maintainability_score_after || 50,
      security_risk_before: data.security_risk_before || 50,
      security_risk_after: data.security_risk_after || 50,
      bug_probability_before: data.bug_probability_before ?? 0.1,
      bug_probability_after: data.bug_probability_after ?? 0.1,
      code_complexity_before: data.code_complexity_before || 50,
      code_complexity_after: data.code_complexity_after || 50,
      status: data.status || 'proposed',
      confidence_level: data.confidence_level || 50,
      completed_at: data.completed_at || null,
    });

    return NextResponse.json({
      success: true,
      refactoring,
    });
  } catch (error) {
    logger.error('Failed to create refactoring:', { data: error });
    return NextResponse.json(
      { error: 'Failed to create refactoring', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const refactoring = refactoringEconomicsDb.update(id, updates);

    if (!refactoring) {
      return NextResponse.json(
        { error: 'Refactoring not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      refactoring,
    });
  } catch (error) {
    logger.error('Failed to update refactoring:', { data: error });
    return NextResponse.json(
      { error: 'Failed to update refactoring', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const deleted = refactoringEconomicsDb.delete(id);

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (error) {
    logger.error('Failed to delete refactoring:', { data: error });
    return NextResponse.json(
      { error: 'Failed to delete refactoring', details: String(error) },
      { status: 500 }
    );
  }
}
