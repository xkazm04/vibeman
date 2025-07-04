import { NextRequest, NextResponse } from 'next/server';
import { processManager } from '@/lib/processManager';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();
    
    const project = useProjectConfigStore.getState().getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    await processManager.startProcess(project.id, project.path, project.port);
    
    return NextResponse.json({
      success: true,
      message: `Started ${project.name} on port ${project.port}`
    });
  } catch (error) {
    console.error('Start API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start process' },
      { status: 500 }
    );
  }
}