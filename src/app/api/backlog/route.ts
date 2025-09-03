import { NextRequest, NextResponse } from 'next/server';
import { backlogDb, DbBacklogItem } from '@/lib/backlogDatabase';
import { v4 as uuidv4 } from 'uuid';

// Convert database item to the format expected by the frontend
function convertDbItemToFrontend(dbItem: DbBacklogItem) {
  // Parse JSON fields
  let steps: string[] | undefined;
  let impactedFiles: any[] | undefined;

  try {
    steps = dbItem.steps ? JSON.parse(dbItem.steps) : undefined;
  } catch (error) {
    console.warn('Failed to parse steps JSON:', error);
    steps = undefined;
  }

  try {
    impactedFiles = dbItem.impacted_files ? JSON.parse(dbItem.impacted_files) : undefined;
  } catch (error) {
    console.warn('Failed to parse impacted_files JSON:', error);
    impactedFiles = undefined;
  }

  return {
    id: dbItem.id,
    project_id: dbItem.project_id,
    goal_id: dbItem.goal_id,
    agent: dbItem.type === 'feature' ? 'developer' : 'mastermind', // Map type to agent
    title: dbItem.title,
    description: dbItem.description,
    status: dbItem.status,
    type: 'proposal', // All items are proposals for now
    steps: steps, // Include parsed steps
    impacted_files: impactedFiles, // Use parsed impacted files
    created_at: dbItem.created_at,
    updated_at: dbItem.updated_at,
    accepted_at: dbItem.accepted_at,
    rejected_at: dbItem.rejected_at
  };
}

// GET - Fetch backlog items for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const backlogItems = backlogDb.getBacklogItemsByProject(projectId);
    
    // Debug logging to check if steps exist in database
    console.log('Debug - Raw database items:', backlogItems.map(item => ({
      id: item.id,
      title: item.title,
      steps: item.steps,
      hasSteps: !!item.steps
    })));
    
    const convertedItems = backlogItems.map(convertDbItemToFrontend);
    
    // Debug logging to check converted items
    console.log('Debug - Converted items:', convertedItems.map(item => ({
      id: item.id,
      title: item.title,
      steps: item.steps,
      hasSteps: !!item.steps
    })));

    return NextResponse.json({
      backlogItems: convertedItems,
      success: true
    });
  } catch (error) {
    console.error('Error fetching backlog items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backlog items' },
      { status: 500 }
    );
  }
}

// POST - Create a new backlog item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      goalId,
      agent,
      title,
      description,
      steps,
      type,
      impactedFiles,
      status = 'pending'
    } = body;

    if (!projectId || !title || !description) {
      return NextResponse.json(
        { error: 'Project ID, title, and description are required' },
        { status: 400 }
      );
    }

    const newItem = backlogDb.createBacklogItem({
      id: uuidv4(),
      project_id: projectId,
      goal_id: goalId || null,
      title,
      description,
      steps: steps || undefined,
      status,
      type: type === 'custom' ? 'feature' : (agent === 'mastermind' ? 'optimization' : 'feature'),
      impacted_files: impactedFiles || []
    });

    const convertedItem = convertDbItemToFrontend(newItem);

    return NextResponse.json({
      backlogItem: convertedItem,
      success: true
    });
  } catch (error) {
    console.error('Error creating backlog item:', error);
    return NextResponse.json(
      { error: 'Failed to create backlog item' },
      { status: 500 }
    );
  }
}

// PUT - Update a backlog item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, title, description, steps, impactedFiles } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (steps !== undefined) updates.steps = steps;
    if (impactedFiles !== undefined) updates.impacted_files = impactedFiles;

    const updatedItem = backlogDb.updateBacklogItem(id, updates);

    if (!updatedItem) {
      return NextResponse.json(
        { error: 'Backlog item not found' },
        { status: 404 }
      );
    }

    const convertedItem = convertDbItemToFrontend(updatedItem);

    return NextResponse.json({
      backlogItem: convertedItem,
      success: true
    });
  } catch (error) {
    console.error('Error updating backlog item:', error);
    return NextResponse.json(
      { error: 'Failed to update backlog item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a backlog item
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const deleted = backlogDb.deleteBacklogItem(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Backlog item not found' },
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
      { error: 'Failed to delete backlog item' },
      { status: 500 }
    );
  }
}