import { NextRequest, NextResponse } from 'next/server';
import { projectServiceDb } from '@/lib/projectServiceDb';

// GET /api/projects - Get all projects
export async function GET() {
  try {
    const projects = await projectServiceDb.getAllProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Projects API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Add a new project
export async function POST(request: NextRequest) {
  try {
    const project = await request.json();

    // Validate required fields
    if (!project.id || !project.name || !project.path || !project.port) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, path, port' },
        { status: 400 }
      );
    }

    // Validate project type
    if (project.type && !['nextjs', 'fastapi', 'other'].includes(project.type)) {
      return NextResponse.json(
        { error: 'Invalid project type. Must be nextjs, fastapi, or other' },
        { status: 400 }
      );
    }

    // Convert form data to Project type
    const projectData = {
      id: project.id,
      name: project.name,
      path: project.path,
      port: project.port,
      description: project.description,
      type: project.type || 'other',
      relatedProjectId: project.relatedProjectId,
      runScript: project.run_script,
      allowMultipleInstances: project.allowMultipleInstances || false,
      basePort: project.basePort || project.port,
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
    console.error('Projects API POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects - Update a project
export async function PUT(request: NextRequest) {
  try {
    const { projectId, updates } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
        { status: 400 }
      );
    }

    // Validate project type if provided
    if (updates.type && !['nextjs', 'fastapi', 'other'].includes(updates.type)) {
      return NextResponse.json(
        { error: 'Invalid project type. Must be nextjs, fastapi, or other' },
        { status: 400 }
      );
    }

    // Convert form data format to Project type format if needed
    const projectUpdates = {
      ...updates,
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
    console.error('Projects API PUT error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects - Remove a project
export async function DELETE(request: NextRequest) {
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
    console.error('Projects API DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove project' },
      { status: 500 }
    );
  }
} 