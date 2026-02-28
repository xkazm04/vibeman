import { NextRequest, NextResponse } from 'next/server';
import { processManager } from '@/lib/processManager';
import { projectDb } from '@/lib/project_database';

export async function POST(request: NextRequest) {
  try {
    const { projectId, port: overridePort } = await request.json();

    const project = projectDb.projects.get(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Use override port if provided, otherwise use project's configured port
    const port = overridePort ?? project.port;

    await processManager.startProcess(project.id, project.path, port);

    return NextResponse.json({
      success: true,
      message: `Started ${project.name} on port ${port}`,
      port
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start process' },
      { status: 500 }
    );
  }
}
