/**
 * API Route: Workspaces
 *
 * GET /api/workspaces - List all workspaces with project mappings
 * POST /api/workspaces - Create workspace
 * PUT /api/workspaces - Update workspace
 * DELETE /api/workspaces - Delete workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { workspaceDb } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet() {
  try {
    const workspaces = workspaceDb.getAll();
    const mappings = workspaceDb.getAllMappings();

    const result = workspaces.map(ws => ({
      ...ws,
      projectIds: mappings[ws.id] || [],
    }));

    return NextResponse.json({ workspaces: result });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch workspaces', details: String(error) },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, icon, projectIds } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    // Get max position for ordering
    const all = workspaceDb.getAll();
    const maxPosition = all.length > 0 ? Math.max(...all.map(w => w.position)) + 1 : 0;

    const workspace = workspaceDb.create({
      name: name.trim(),
      description: description || null,
      color: color || '#6366f1',
      icon: icon || 'folder',
      position: maxPosition,
    });

    // Assign projects if provided
    if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) {
      workspaceDb.setProjects(workspace.id, projectIds);
    }

    const resultProjectIds = workspaceDb.getProjectIds(workspace.id);

    return NextResponse.json({
      workspace: { ...workspace, projectIds: resultProjectIds },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create workspace', details: String(error) },
      { status: 500 }
    );
  }
}

async function handlePut(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, ...updates } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    const workspace = workspaceDb.update(workspaceId, updates);
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const projectIds = workspaceDb.getProjectIds(workspaceId);
    return NextResponse.json({ workspace: { ...workspace, projectIds } });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update workspace', details: String(error) },
      { status: 500 }
    );
  }
}

async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId query parameter is required' },
        { status: 400 }
      );
    }

    const deleted = workspaceDb.delete(workspaceId);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete workspace', details: String(error) },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/workspaces');
export const POST = withObservability(handlePost, '/api/workspaces');
export const PUT = withObservability(handlePut, '/api/workspaces');
export const DELETE = withObservability(handleDelete, '/api/workspaces');
