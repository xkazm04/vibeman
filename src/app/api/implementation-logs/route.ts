import { NextRequest, NextResponse } from 'next/server';
import { implementationLogDb } from '@/app/db';

/**
 * GET - Get recent implementation logs for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limitParam = searchParams.get('limit');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 5;

    const logs = implementationLogDb.getRecentLogsByProject(projectId, limit);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching implementation logs:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new implementation log
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, project_id, requirement_name, title, overview, tested } = body;

    if (!id || !project_id || !requirement_name || !title || !overview) {
      return NextResponse.json(
        { error: 'Missing required fields: id, project_id, requirement_name, title, overview' },
        { status: 400 }
      );
    }

    const log = implementationLogDb.createLog({
      id,
      project_id,
      requirement_name,
      title,
      overview,
      tested: tested || false,
    });

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Error creating implementation log:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update an implementation log (e.g., mark as tested)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, tested, overview } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Log ID is required' },
        { status: 400 }
      );
    }

    const log = implementationLogDb.updateLog(id, {
      tested: tested !== undefined ? tested : undefined,
      overview: overview !== undefined ? overview : undefined,
    });

    if (!log) {
      return NextResponse.json(
        { error: 'Log not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Error updating implementation log:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete an implementation log
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Log ID is required' },
        { status: 400 }
      );
    }

    implementationLogDb.deleteLog(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting implementation log:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
