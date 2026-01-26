import { NextRequest, NextResponse } from 'next/server';
import { projectServiceDb } from '@/lib/projectServiceDb';
import { logger } from '@/lib/logger';
import { detectProjectTypeSync } from '@/lib/projectTypeDetector';
import type { ProjectType } from '@/types';
import { withObservability } from '@/lib/observability/middleware';

const VALID_PROJECT_TYPES: ProjectType[] = [
  'nextjs', 'react', 'express', 'fastapi', 'django', 'rails', 'generic', 'combined'
];

// GET /api/projects - Get all projects
async function handleGet() {
  try {
    const projects = await projectServiceDb.getAllProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    logger.error('Projects API GET error:', { error: error });
    return NextResponse.json(
      { error: 'Failed to get projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Add a new project
async function handlePost(request: NextRequest) {
  try {
    const project = await request.json();

    // Validate required fields (port is optional for 'combined' type)
    const isCombined = project.type === 'combined';
    if (!project.id || !project.name || !project.path || (!isCombined && !project.port)) {
      return NextResponse.json(
        { error: isCombined ? 'Missing required fields: id, name, path' : 'Missing required fields: id, name, path, port' },
        { status: 400 }
      );
    }

    // Validate project type if manually specified
    if (project.type && !VALID_PROJECT_TYPES.includes(project.type)) {
      return NextResponse.json(
        { error: `Invalid project type. Must be one of: ${VALID_PROJECT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Auto-detect project type if not provided
    let detectedType: ProjectType = 'generic';
    if (!project.type) {
      try {
        detectedType = detectProjectTypeSync(project.path);
        logger.info('Auto-detected project type:', { path: project.path, type: detectedType });
      } catch (err) {
        logger.warn('Project type detection failed, using generic:', { error: err });
      }
    }

    // Convert form data to Project type
    const projectData = {
      id: project.id,
      name: project.name,
      path: project.path,
      port: project.port ?? null, // Port is now optional
      workspaceId: project.workspaceId || null,
      type: project.type || detectedType,
      relatedProjectId: project.relatedProjectId,
      runScript: project.run_script,
      allowMultipleInstances: project.allowMultipleInstances || false,
      basePort: project.basePort || project.port || undefined,
      instanceOf: project.instanceOf,
      git: project.git_repository ? {
        repository: project.git_repository,
        branch: project.git_branch || 'main',
        autoSync: false
      } : undefined
    };

    await projectServiceDb.addProject(projectData);

    return NextResponse.json({
      success: true,
      message: 'Project added successfully'
    });
  } catch (error) {
    logger.error('Projects API POST error:', { error: error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects - Update a project
async function handlePut(request: NextRequest) {
  try {
    const { projectId, updates } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
        { status: 400 }
      );
    }

    // Validate project type if provided
    if (updates.type && !VALID_PROJECT_TYPES.includes(updates.type)) {
      return NextResponse.json(
        { error: `Invalid project type. Must be one of: ${VALID_PROJECT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Convert form data format to Project type format if needed
    const projectUpdates = {
      ...updates,
      // Handle workspaceId if provided
      workspaceId: updates.workspaceId !== undefined ? updates.workspaceId : undefined,
      git: updates.git_repository ? {
        repository: updates.git_repository,
        branch: updates.git_branch || 'main',
        autoSync: false
      } : updates.git
    };

    await projectServiceDb.updateProject(projectId, projectUpdates);

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully'
    });
  } catch (error) {
    logger.error('Projects API PUT error:', { error: error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects - Remove a project
async function handleDelete(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
        { status: 400 }
      );
    }

    await projectServiceDb.removeProject(projectId);

    return NextResponse.json({
      success: true,
      message: 'Project removed successfully'
    });
  } catch (error) {
    logger.error('Projects API DELETE error:', { error: error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove project' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/projects');
export const POST = withObservability(handlePost, '/api/projects');
export const PUT = withObservability(handlePut, '/api/projects');
export const DELETE = withObservability(handleDelete, '/api/projects'); 