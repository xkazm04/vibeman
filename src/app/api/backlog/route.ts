import { NextRequest, NextResponse } from 'next/server';
import { backlogDb } from '@/lib/database';
import { randomUUID } from 'crypto';

// GET /api/backlog?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const backlogItems = backlogDb.getBacklogItemsByProject(projectId);
    return NextResponse.json({ backlogItems });
  } catch (error) {
    console.error('Error in GET /api/backlog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/backlog
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      projectId, 
      goalId, 
      agent, 
      title, 
      description, 
      type = 'proposal', 
      impactedFiles = [],
      status = 'pending' 
    } = body;

    if (!projectId || !agent || !title || !description) {
      return NextResponse.json({ 
        error: 'Project ID, agent, title, and description are required' 
      }, { status: 400 });
    }

    const backlogItem = backlogDb.createBacklogItem({
      id: randomUUID(),
      project_id: projectId,
      goal_id: goalId || null,
      agent,
      title,
      description,
      type,
      impacted_files: impactedFiles,
      status
    });

    return NextResponse.json({ backlogItem });
  } catch (error) {
    console.error('Error in POST /api/backlog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/backlog
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, goalId, title, description, impactedFiles } = body;

    if (!id) {
      return NextResponse.json({ error: 'Backlog item ID is required' }, { status: 400 });
    }

    const updateData: {
      status?: 'pending' | 'accepted' | 'rejected' | 'in_progress';
      goal_id?: string | null;
      title?: string;
      description?: string;
      impacted_files?: any[];
    } = {};
    
    if (status !== undefined) updateData.status = status;
    if (goalId !== undefined) updateData.goal_id = goalId;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (impactedFiles !== undefined) updateData.impacted_files = impactedFiles;

    const backlogItem = backlogDb.updateBacklogItem(id, updateData);

    if (!backlogItem) {
      return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });
    }

    return NextResponse.json({ backlogItem });
  } catch (error) {
    console.error('Error in PUT /api/backlog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/backlog?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Backlog item ID is required' }, { status: 400 });
    }

    const success = backlogDb.deleteBacklogItem(id);

    if (!success) {
      return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/backlog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 