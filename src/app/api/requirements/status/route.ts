import { NextRequest, NextResponse } from 'next/server';
import { FileSystemInterface } from '../../../../lib/fileSystemInterface';
import { ClaudeTaskManager } from '../../../../lib/claudeTaskManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');

    if (!projectPath) {
      return NextResponse.json({ 
        message: 'Project path is required' 
      }, { status: 400 });
    }

    const fileSystem = new FileSystemInterface(projectPath);
    const taskManager = new ClaudeTaskManager(fileSystem, projectPath);

    const completedTasks = await taskManager.checkTaskStatus();

    return NextResponse.json({
      success: true,
      completedTasks,
      count: completedTasks.length
    });

  } catch (error) {
    console.error('Error checking status:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to check status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 