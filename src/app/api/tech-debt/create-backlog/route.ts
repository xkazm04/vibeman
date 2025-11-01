/**
 * Create Backlog Item from Tech Debt API
 * POST /api/tech-debt/create-backlog - Convert tech debt item to backlog item
 */

import { NextRequest, NextResponse } from 'next/server';
import { techDebtDb, backlogDb } from '@/app/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { techDebtId, goalId } = body;

    if (!techDebtId) {
      return NextResponse.json(
        { error: 'techDebtId is required' },
        { status: 400 }
      );
    }

    // Get tech debt item
    const techDebt = techDebtDb.getTechDebtById(techDebtId);

    if (!techDebt) {
      return NextResponse.json(
        { error: 'Tech debt item not found' },
        { status: 404 }
      );
    }

    // Check if backlog item already exists
    if (techDebt.backlog_item_id) {
      return NextResponse.json(
        { error: 'Backlog item already exists for this tech debt', backlogItemId: techDebt.backlog_item_id },
        { status: 400 }
      );
    }

    // Create backlog item
    const backlogId = `backlog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const impactedFiles = techDebt.file_paths
      ? JSON.parse(techDebt.file_paths).map((path: string) => ({
          path,
          changeType: 'modify',
          description: 'Address technical debt'
        }))
      : [];

    const backlogItem = backlogDb.createBacklogItem({
      id: backlogId,
      project_id: techDebt.project_id,
      goal_id: goalId || techDebt.goal_id || null,
      agent: 'developer',
      title: `[Tech Debt] ${techDebt.title}`,
      description: `${techDebt.description}\n\n**Severity:** ${techDebt.severity}\n**Risk Score:** ${techDebt.risk_score}\n**Estimated Effort:** ${techDebt.estimated_effort_hours || 'TBD'} hours\n\n**Technical Impact:** ${techDebt.technical_impact}\n**Business Impact:** ${techDebt.business_impact}`,
      status: 'pending',
      type: 'custom',
      impacted_files: impactedFiles
    });

    // Update tech debt to link to backlog item
    const updatedTechDebt = techDebtDb.updateTechDebt(techDebtId, {
      backlog_item_id: backlogId,
      status: 'planned'
    });

    return NextResponse.json({
      success: true,
      backlogItem,
      techDebt: updatedTechDebt
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating backlog item from tech debt:', error);
    return NextResponse.json(
      { error: 'Failed to create backlog item', details: String(error) },
      { status: 500 }
    );
  }
}
