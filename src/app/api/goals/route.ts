import { NextRequest, NextResponse } from 'next/server';
import { goalDb } from '@/lib/database';
import { randomUUID } from 'crypto';

// GET /api/goals?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const goals = goalDb.getGoalsByProject(projectId);
    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Error in GET /api/goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/goals
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, title, description, status = 'open', orderIndex } = body;

    if (!projectId || !title) {
      return NextResponse.json({ error: 'Project ID and title are required' }, { status: 400 });
    }

    // If no order index provided, get the next available one
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined) {
      finalOrderIndex = goalDb.getMaxOrderIndex(projectId) + 1;
    }

    const goal = goalDb.createGoal({
      id: randomUUID(),
      project_id: projectId,
      title,
      description,
      status,
      order_index: finalOrderIndex
    });

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Error in POST /api/goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/goals
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, description, status, orderIndex } = body;

    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const updateData: {
      title?: string;
      description?: string;
      status?: 'open' | 'in_progress' | 'done';
      order_index?: number;
    } = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (orderIndex !== undefined) updateData.order_index = orderIndex;

    const goal = goalDb.updateGoal(id, updateData);

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Error in PUT /api/goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/goals?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const success = goalDb.deleteGoal(id);

    if (!success) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 