import { NextRequest, NextResponse } from 'next/server';
import { FileSystemInterface } from '../../../../lib/fileSystemInterface';
import { ClaudeTaskManager } from '../../../../lib/claudeTaskManager';
import { createErrorResponse } from '../../../../lib/api-helpers';

async function getCompletedTasks(projectPath: string) {
  const fileSystem = new FileSystemInterface(projectPath);
  const taskManager = new ClaudeTaskManager(fileSystem, projectPath);
  return await taskManager.checkTaskStatus();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');

    if (!projectPath) {
      return createErrorResponse('Project path is required', 400);
    }

    const completedTasks = await getCompletedTasks(projectPath);

    return NextResponse.json({
      success: true,
      completedTasks,
      count: completedTasks.length
    });

  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to check status',
      500
    );
  }
} 