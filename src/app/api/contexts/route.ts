import { NextRequest, NextResponse } from 'next/server';
import { contextQueries, contextGroupQueries } from '../../../lib/queries/contextQueries';

// GET /api/contexts - Get all contexts and groups for a project
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

    const [contexts, groups] = await Promise.all([
      contextQueries.getContextsByProject(projectId),
      contextGroupQueries.getGroupsByProject(projectId),
    ]);

    return NextResponse.json({
      success: true,
      data: { contexts, groups }
    });
  } catch (error) {
    console.error('Failed to fetch contexts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contexts' },
      { status: 500 }
    );
  }
}

// POST /api/contexts - Create a new context
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, groupId, name, description, filePaths } = body;

    if (!projectId || !groupId || !name || !filePaths) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const context = await contextQueries.createContext({
      projectId,
      groupId,
      name,
      description,
      filePaths,
    });

    return NextResponse.json({
      success: true,
      data: context
    });
  } catch (error) {
    console.error('Failed to create context:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create context' },
      { status: 500 }
    );
  }
}

// PUT /api/contexts - Update a context
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { contextId, updates } = body;

    if (!contextId) {
      return NextResponse.json(
        { error: 'Context ID is required' },
        { status: 400 }
      );
    }

    const context = await contextQueries.updateContext(contextId, updates);

    if (!context) {
      return NextResponse.json(
        { error: 'Context not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: context
    });
  } catch (error) {
    console.error('Failed to update context:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update context' },
      { status: 500 }
    );
  }
}

// DELETE /api/contexts - Delete a context
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');

    if (!contextId) {
      return NextResponse.json(
        { error: 'Context ID is required' },
        { status: 400 }
      );
    }

    const success = await contextQueries.deleteContext(contextId);

    if (!success) {
      return NextResponse.json(
        { error: 'Context not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Context deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete context:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete context' },
      { status: 500 }
    );
  }
}