import { NextRequest, NextResponse } from 'next/server';
import { contextGroupQueries } from '../../../lib/queries/contextQueries';

// GET /api/context-groups - Get all context groups for a project
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

    const groups = await contextGroupQueries.getGroupsByProject(projectId);

    return NextResponse.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Failed to fetch context groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch context groups' },
      { status: 500 }
    );
  }
}

// POST /api/context-groups - Create a new context group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, name, color } = body;

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'Project ID and name are required' },
        { status: 400 }
      );
    }

    const group = await contextGroupQueries.createGroup({
      projectId,
      name,
      color,
    });

    return NextResponse.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Failed to create context group:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create context group' },
      { status: 500 }
    );
  }
}

// PUT /api/context-groups - Update a context group
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, updates } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    const group = await contextGroupQueries.updateGroup(groupId, updates);

    if (!group) {
      return NextResponse.json(
        { error: 'Context group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Failed to update context group:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update context group' },
      { status: 500 }
    );
  }
}

// DELETE /api/context-groups - Delete a context group
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    const success = await contextGroupQueries.deleteGroup(groupId);

    if (!success) {
      return NextResponse.json(
        { error: 'Context group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Context group deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete context group:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete context group' },
      { status: 500 }
    );
  }
}