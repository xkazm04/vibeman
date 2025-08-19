import { NextRequest, NextResponse } from 'next/server';
import { backgroundTaskDb } from '../../../../lib/server/backgroundTaskDatabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    console.log('Testing background task creation...');
    
    // Test creating a coding_task
    const testTaskId = uuidv4();
    const testTask = backgroundTaskDb.createTask({
      id: testTaskId,
      project_id: 'test-project',
      project_name: 'Test Project',
      project_path: process.cwd(),
      task_type: 'coding_task',
      priority: 1,
      task_data: JSON.stringify({ taskId: 'test-backlog-task-id' })
    });
    
    console.log('Successfully created test task:', testTask);
    
    // Clean up the test task
    backgroundTaskDb.updateTask(testTaskId, { status: 'cancelled' });
    
    return NextResponse.json({
      success: true,
      message: 'Background task creation test successful',
      testTask: testTask
    });
  } catch (error) {
    console.error('Background task creation test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 });
  }
}