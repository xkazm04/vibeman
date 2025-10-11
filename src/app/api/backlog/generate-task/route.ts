import { NextRequest, NextResponse } from 'next/server';
import { generateBacklogTask } from '../../../coder/Backlog/lib/generateBacklogTask';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      projectId, 
      projectName, 
      projectPath, 
      taskRequest, 
      mode, 
      selectedContexts, 
      selectedFilePaths 
    } = body;

    // Validate required fields
    if (!projectId || !projectName || !projectPath || !taskRequest || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate mode-specific requirements
    if (mode === 'context' && (!selectedContexts || selectedContexts.length === 0)) {
      return NextResponse.json(
        { error: 'Context mode requires at least one selected context' },
        { status: 400 }
      );
    }

    if (mode === 'individual' && (!selectedFilePaths || selectedFilePaths.length === 0)) {
      return NextResponse.json(
        { error: 'Individual mode requires at least one selected file' },
        { status: 400 }
      );
    }

    console.log(`Generating backlog task for project: ${projectName}`);
    console.log(`Task request: ${taskRequest}`);
    console.log(`Mode: ${mode}`);
    console.log(`Selected contexts: ${selectedContexts?.length || 0}`);
    console.log(`Selected files: ${selectedFilePaths?.length || 0}`);

    const result = await generateBacklogTask({
      projectId,
      projectName,
      projectPath,
      taskRequest,
      mode,
      selectedContexts: selectedContexts || [],
      selectedFilePaths: selectedFilePaths || []
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        taskId: result.taskId,
        message: 'Backlog task generated successfully'
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to generate backlog task' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to generate backlog task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}