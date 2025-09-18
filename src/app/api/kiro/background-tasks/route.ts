import { NextRequest, NextResponse } from 'next/server';
import { backgroundTaskDb } from '../../../../lib/server/backgroundTaskDatabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');

    let tasks;
    if (projectId) {
      tasks = backgroundTaskDb.getTasksByProject(projectId);
    } else if (status) {
      tasks = backgroundTaskDb.getTasksByStatus(status, limit);
    } else {
      tasks = backgroundTaskDb.getAllTasks(limit);
    }

    const taskCounts = backgroundTaskDb.getTaskCounts();
    const queueSettings = backgroundTaskDb.getQueueSettings();

    return NextResponse.json({
      success: true,
      tasks,
      taskCounts,
      queueSettings: {
        isActive: queueSettings.is_active === 1,
        pollInterval: queueSettings.poll_interval,
        maxConcurrentTasks: queueSettings.max_concurrent_tasks,
        lastPollAt: queueSettings.last_poll_at
      }
    });
  } catch (error) {
    console.error('Error fetching background tasks:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch background tasks'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      projectId, 
      projectName, 
      projectPath, 
      taskType, 
      priority = 0,
      maxRetries = 3,
      taskData,
      apiKeys
    } = body;

    // Validate required fields
    if (!projectId || !projectName || !projectPath || !taskType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: projectId, projectName, projectPath, taskType'
      }, { status: 400 });
    }

    // Validate task type
    const validTaskTypes = ['docs', 'tasks', 'goals', 'context', 'code', 'coding_task'];
    if (!validTaskTypes.includes(taskType)) {
      return NextResponse.json({
        success: false,
        error: `Invalid task type. Must be one of: ${validTaskTypes.join(', ')}`
      }, { status: 400 });
    }

    // Check if similar task already exists and is pending/processing
    const existingTasks = backgroundTaskDb.getTasksByProject(projectId);
    
    // For coding tasks, check if the same taskId is already being processed
    if (taskType === 'coding_task' && taskData?.taskId) {
      const duplicateTask = existingTasks.find(task => {
        if (task.task_type !== 'coding_task' || (task.status !== 'pending' && task.status !== 'processing')) {
          return false;
        }
        
        try {
          const existingTaskData = task.task_data ? JSON.parse(task.task_data) : {};
          return existingTaskData.taskId === taskData.taskId;
        } catch {
          return false;
        }
      });

      if (duplicateTask) {
        return NextResponse.json({
          success: false,
          error: `This coding task is already pending or processing`,
          existingTaskId: duplicateTask.id
        }, { status: 409 });
      }
    } else {
      // For other task types, check by task type only
      const duplicateTask = existingTasks.find(task => 
        task.task_type === taskType && 
        (task.status === 'pending' || task.status === 'processing')
      );

      if (duplicateTask) {
        return NextResponse.json({
          success: false,
          error: `A ${taskType} task for this project is already pending or processing`,
          existingTaskId: duplicateTask.id
        }, { status: 409 });
      }
    }

    // Create new background task
    const taskId = uuidv4();
    const taskDataWithApiKeys = {
      ...taskData,
      apiKeys
    };
    
    const newTask = backgroundTaskDb.createTask({
      id: taskId,
      project_id: projectId,
      project_name: projectName,
      project_path: projectPath,
      task_type: taskType as 'docs' | 'tasks' | 'goals' | 'context' | 'code' | 'coding_task',
      priority,
      max_retries: maxRetries,
      task_data: JSON.stringify(taskDataWithApiKeys)
    });

    return NextResponse.json({
      success: true,
      task: newTask,
      message: `Background ${taskType} task created successfully`
    });
  } catch (error) {
    console.error('Error creating background task:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create background task'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, status, errorMessage, resultData } = body;

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: taskId'
      }, { status: 400 });
    }

    const updates: any = {};
    
    if (status) {
      updates.status = status;
      if (status === 'processing') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'completed' || status === 'error' || status === 'cancelled') {
        updates.completed_at = new Date().toISOString();
      }
    }
    
    if (errorMessage !== undefined) {
      updates.error_message = errorMessage;
    }
    
    if (resultData !== undefined) {
      updates.result_data = resultData;
    }

    const updatedTask = backgroundTaskDb.updateTask(taskId, updates);

    if (!updatedTask) {
      return NextResponse.json({
        success: false,
        error: 'Task not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      task: updatedTask
    });
  } catch (error) {
    console.error('Error updating background task:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update background task'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const action = searchParams.get('action'); // 'cancel', 'retry', 'delete', 'clear-completed'

    if (action === 'clear-completed') {
      // Clear all completed tasks
      const completedTasks = backgroundTaskDb.getTasksByStatus('completed');
      let deletedCount = 0;
      
      for (const task of completedTasks) {
        if (backgroundTaskDb.deleteTask(task.id)) {
          deletedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Cleared ${deletedCount} completed tasks`
      });
    }

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: taskId'
      }, { status: 400 });
    }

    switch (action) {
      case 'cancel':
        const cancelledTask = backgroundTaskDb.cancelTask(taskId);
        if (!cancelledTask) {
          return NextResponse.json({
            success: false,
            error: 'Task not found'
          }, { status: 404 });
        }
        return NextResponse.json({
          success: true,
          task: cancelledTask,
          message: 'Task cancelled successfully'
        });

      case 'retry':
        try {
          const retriedTask = backgroundTaskDb.retryTask(taskId);
          if (!retriedTask) {
            return NextResponse.json({
              success: false,
              error: 'Task not found'
            }, { status: 404 });
          }
          return NextResponse.json({
            success: true,
            task: retriedTask,
            message: 'Task queued for retry'
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to retry task'
          }, { status: 400 });
        }

      case 'delete':
      default:
        const deleted = backgroundTaskDb.deleteTask(taskId);
        if (!deleted) {
          return NextResponse.json({
            success: false,
            error: 'Task not found'
          }, { status: 404 });
        }
        return NextResponse.json({
          success: true,
          message: 'Task deleted successfully'
        });
    }
  } catch (error) {
    console.error('Error processing background task action:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process task action'
    }, { status: 500 });
  }
}