import { NextRequest, NextResponse } from 'next/server';
import { processManager } from '@/lib/processManager';
import { projectService } from '@/lib/projectService';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();
    console.log(`[START API] Received request for projectId: ${projectId}`);
    
    // Use server-side project service instead of client-side store
    const allProjects = await projectService.getAllProjects();
    console.log(`[START API] All projects from service:`, allProjects.map(p => ({ 
      id: p.id, 
      name: p.name, 
      path: p.path, 
      port: p.port 
    })));
    
    const project = await projectService.getProject(projectId);
    console.log(`[START API] Looking for project with ID: ${projectId}`);
    console.log(`[START API] Found project:`, project ? { 
      id: project.id, 
      name: project.name, 
      path: project.path, 
      port: project.port 
    } : null);
    
    if (!project) {
      console.error(`[START API] Project not found: ${projectId}`);
      console.log('[START API] Available projects:', allProjects.map(p => ({ id: p.id, name: p.name, path: p.path })));
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    console.log(`[START API] Starting project: ${project.name} at ${project.path} on port ${project.port}`);
    await processManager.startProcess(project.id, project.path, project.port);
    
    return NextResponse.json({
      success: true,
      message: `Started ${project.name} on port ${project.port}`
    });
  } catch (error) {
    console.error('[START API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start process' },
      { status: 500 }
    );
  }
}