import { NextRequest, NextResponse } from 'next/server';
import { backgroundTaskDb } from '../../../../../lib/server/backgroundTaskDatabase';

// Server-side queue management
let queueInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

async function processNextTask(): Promise<boolean> {
  if (isProcessing) {
    return false; // Skip if already processing
  }

  try {
    isProcessing = true;
    const pendingTasks = backgroundTaskDb.getPendingTasks(1);
    if (pendingTasks.length === 0) {
      return false; // No more tasks to process
    }

    const task = pendingTasks[0];
    console.log('Processing background task:', task.id, task.task_type);

    // Update task status to processing
    backgroundTaskDb.updateTask(task.id, {
      status: 'processing',
      started_at: new Date().toISOString()
    });

    // Call the appropriate API based on task type
    let apiEndpoint = '';
    let requestBody: any = {
      projectId: task.project_id,
      projectPath: task.project_path,
      projectName: task.project_name
    };

    switch (task.task_type) {
      case 'docs':
      case 'goals':
        apiEndpoint = '/api/kiro/ai-project-review';
        requestBody.mode = task.task_type;
        break;
      case 'context':
        apiEndpoint = '/api/kiro/generate-context-background';
        break;
      case 'code':
        apiEndpoint = '/api/kiro/ai-project-review';
        requestBody.mode = 'code';
        break;
      default:
        throw new Error(`Unknown task type: ${task.task_type}`);
    }

    // Make the API call
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}${apiEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    if (result.success) {
      // Task completed successfully
      backgroundTaskDb.updateTask(task.id, {
        status: 'completed',
        result_data: result,
        completed_at: new Date().toISOString()
      });
      console.log('Task completed successfully:', task.id);
    } else {
      // Task failed
      backgroundTaskDb.updateTask(task.id, {
        status: 'error',
        error_message: result.error || 'Task processing failed',
        completed_at: new Date().toISOString()
      });
      console.log('Task failed:', task.id, result.error);
    }

    return true; // Task was processed
  } catch (error) {
    console.error('Error processing background task:', error);

    // Update task status to error if we have the task ID
    const pendingTasks = backgroundTaskDb.getPendingTasks(1);
    if (pendingTasks.length > 0) {
      backgroundTaskDb.updateTask(pendingTasks[0].id, {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error occurred',
        completed_at: new Date().toISOString()
      });
    }

    return true; // Continue processing other tasks
  } finally {
    isProcessing = false;
  }
}

function startQueue() {
  if (queueInterval) {
    console.log('Queue is already running');
    return;
  }

  console.log('Starting background task queue...');

  // Update queue settings
  backgroundTaskDb.updateQueueSettings({
    is_active: true,
    last_poll_at: new Date().toISOString()
  });

  // Start polling for tasks
  queueInterval = setInterval(async () => {
    try {
      const hasMoreTasks = await processNextTask();

      // Stop queue if no more pending tasks
      const counts = backgroundTaskDb.getTaskCounts();
      if (counts.pending === 0 && counts.processing === 0) {
        console.log('No more tasks to process, stopping queue');
        stopQueue();
      }
    } catch (error) {
      console.error('Error in queue processing:', error);
    }
  }, 2000); // Process every 2 seconds
}

function stopQueue() {
  console.log('Stopping background task queue...');

  // Update queue settings
  backgroundTaskDb.updateQueueSettings({
    is_active: false,
    last_poll_at: new Date().toISOString()
  });

  // Clear polling interval
  if (queueInterval) {
    clearInterval(queueInterval);
    queueInterval = null;
  }
}

function isQueueActive(): boolean {
  return queueInterval !== null;
}

export async function GET(request: NextRequest) {
  try {
    const settings = backgroundTaskDb.getQueueSettings();
    const counts = backgroundTaskDb.getTaskCounts();

    return NextResponse.json({
      success: true,
      queueSettings: {
        isActive: settings.is_active === 1 || isQueueActive(),
        pollInterval: settings.poll_interval,
        maxConcurrentTasks: settings.max_concurrent_tasks,
        lastPollAt: settings.last_poll_at
      },
      taskCounts: counts
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get queue status'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: action'
      }, { status: 400 });
    }

    switch (action) {
      case 'start':
        startQueue();
        return NextResponse.json({
          success: true,
          message: 'Queue started successfully',
          isActive: true
        });

      case 'stop':
        stopQueue();
        return NextResponse.json({
          success: true,
          message: 'Queue stopped successfully',
          isActive: false
        });

      case 'status':
        const settings = backgroundTaskDb.getQueueSettings();
        const counts = backgroundTaskDb.getTaskCounts();
        return NextResponse.json({
          success: true,
          queueSettings: {
            isActive: settings.is_active === 1 || isQueueActive(),
            pollInterval: settings.poll_interval,
            maxConcurrentTasks: settings.max_concurrent_tasks,
            lastPollAt: settings.last_poll_at
          },
          taskCounts: counts
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing queue:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to manage queue'
    }, { status: 500 });
  }
}

// Cleanup on process exit
process.on('exit', () => {
  stopQueue();
});

process.on('SIGINT', () => {
  stopQueue();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopQueue();
  process.exit(0);
});