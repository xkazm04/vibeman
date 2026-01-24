/**
 * API Route: Workspace Project Assignment
 *
 * PUT /api/workspaces/projects - Set all projects for a workspace
 * POST /api/workspaces/projects - Add single project to workspace
 * DELETE /api/workspaces/projects - Remove project from workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { workspaceDb } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';

async function handlePut(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, projectIds } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(projectIds)) {
      return NextResponse.json(
        { error: 'projectIds must be an array' },
        { status: 400 }
      );
    }

    const workspace = workspaceDb.getById(workspaceId);
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    workspaceDb.setProjects(workspaceId, projectIds);

    const updatedProjectIds = workspaceDb.getProjectIds(workspaceId);
    return NextResponse.json({
      workspace: { ...workspace, projectIds: updatedProjectIds },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to set workspace projects', details: String(error) },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, projectId } = body;

    if (!workspaceId || !projectId) {
      return NextResponse.json(
        { error: 'workspaceId and projectId are required' },
        { status: 400 }
      );
    }

    const workspace = workspaceDb.getById(workspaceId);
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    workspaceDb.addProject(workspaceId, projectId);

    const projectIds = workspaceDb.getProjectIds(workspaceId);
    return NextResponse.json({
      workspace: { ...workspace, projectIds },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add project to workspace', details: String(error) },
      { status: 500 }
    );
  }
}

async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const projectId = searchParams.get('projectId');

    if (!workspaceId || !projectId) {
      return NextResponse.json(
        { error: 'workspaceId and projectId query parameters are required' },
        { status: 400 }
      );
    }

    const removed = workspaceDb.removeProject(workspaceId, projectId);
    if (!removed) {
      return NextResponse.json(
        { error: 'Project not found in workspace' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to remove project from workspace', details: String(error) },
      { status: 500 }
    );
  }
}

export const PUT = withObservability(handlePut, '/api/workspaces/projects');
export const POST = withObservability(handlePost, '/api/workspaces/projects');
export const DELETE = withObservability(handleDelete, '/api/workspaces/projects');
