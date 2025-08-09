import { NextRequest, NextResponse } from 'next/server';
import { backlogDb } from '../../../lib/backlogDatabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    let backlogItems;

    if (status) {
      backlogItems = backlogDb.getBacklogItemsByStatus(projectId, status);
    } else if (type) {
      backlogItems = backlogDb.getBacklogItemsByType(projectId, type as 'feature' | 'optimization');
    } else {
      backlogItems = backlogDb.getBacklogItemsByProject(projectId);
    }

    return NextResponse.json({
      success: true,
      backlogItems: backlogItems
    });
  } catch (error) {
    console.error('Error fetching backlog items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch backlog items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      projectId,
      goalId,
      title,
      description,
      steps,
      status = 'undecided',
      type,
      impactedFiles
    } = await request.json();

    if (!projectId || !title || !description || !type) {
      return NextResponse.json(
        { success: false, error: 'Project ID, title, description, and type are required' },
        { status: 400 }
      );
    }

    const backlogItem = backlogDb.createBacklogItem({
      id: uuidv4(),
      project_id: projectId,
      goal_id: goalId,
      title,
      description,
      steps,
      status,
      type,
      impacted_files: impactedFiles
    });

    return NextResponse.json({
      success: true,
      backlogItem: backlogItem
    });
  } catch (error) {
    console.error('Error creating backlog item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create backlog item' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      status,
      goalId,
      title,
      description,
      steps,
      impactedFiles
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Backlog item ID is required' },
        { status: 400 }
      );
    }

    const updatedItem = backlogDb.updateBacklogItem(id, {
      status,
      goal_id: goalId,
      title,
      description,
      steps,
      impacted_files: impactedFiles
    });

    if (!updatedItem) {
      return NextResponse.json(
        { success: false, error: 'Backlog item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      backlogItem: updatedItem
    });
  } catch (error) {
    console.error('Error updating backlog item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update backlog item' },
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
        { success: false, error: 'Backlog item ID is required' },
        { status: 400 }
      );
    }

    const deleted = backlogDb.deleteBacklogItem(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Backlog item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Backlog item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting backlog item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete backlog item' },
      { status: 500 }
    );
  }
}