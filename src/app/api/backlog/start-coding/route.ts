import { NextRequest, NextResponse } from 'next/server';
import { backlogDb } from '../../../../lib/backlogDatabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    console.log(`Starting coding task: ${taskId}`);

    // Get the task to validate it exists and get project info
    const task = backlogDb.getBacklogItemById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Update task status to in_progress
    const updatedTask = backlogDb.updateBacklogItem(taskId, { status: 'in_progress' });
    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Failed to update task status' },
        { status: 500 }
      );
    }

    // Get the actual project path from the projects API
    let actualProjectPath = process.cwd(); // Default fallback
    let projectName = `Project ${task.project_id}`;
    
    try {
      // Get all projects and find the matching one
      const projectsResponse = await fetch(`${request.nextUrl.origin}/api/projects`);
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        const project = projectsData.projects?.find((p: any) => p.id === task.project_id);
        if (project) {
          actualProjectPath = project.path;
          projectName = project.name;
          console.log(`Found project: ${projectName} at ${actualProjectPath}`);
        } else {
          console.warn(`Project ${task.project_id} not found in projects list`);
        }
      }
    } catch (error) {
      console.warn('Could not fetch project details, using defaults:', error);
    }

    console.log(`Using project path: ${actualProjectPath}`);

    // Queue the coding task in the background
    const queueResponse = await fetch(`${request.nextUrl.origin}/api/kiro/background-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: task.project_id,
        projectName: projectName,
        projectPath: actualProjectPath,
        taskType: 'coding_task',
        priority: 1,
        taskData: { taskId: taskId }
      })
    });

    if (!queueResponse.ok) {
      console.error('Failed to queue coding task');
      // Revert task status
      backlogDb.updateBacklogItem(taskId, { status: 'accepted' });
      return NextResponse.json(
        { error: 'Failed to queue coding task' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Coding task started successfully',
      taskId: taskId
    });

  } catch (error) {
    console.error('Failed to start coding task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}