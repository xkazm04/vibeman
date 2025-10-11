/**
 * Handle async task operations with proper error handling
 */
export async function executeTaskAction<T>(
  action: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    console.error(errorMessage, error);
    throw error;
  }
}

/**
 * Update task status on server
 */
export async function updateTaskStatus(
  taskId: string,
  status: string
): Promise<void> {
  const response = await fetch('/api/backlog/update-task', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId,
      updates: { status }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to update task status: ${response.status}`);
  }
}

/**
 * Delete task from server
 */
export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch('/api/backlog/delete-task', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId })
  });

  if (!response.ok) {
    throw new Error(`Failed to delete task: ${response.status}`);
  }
}

/**
 * Start coding task in background
 */
export async function startCodingTask(taskId: string): Promise<void> {
  const response = await fetch('/api/backlog/start-coding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId })
  });

  if (!response.ok) {
    throw new Error('Failed to start coding task');
  }
}

/**
 * Queue background task for coding
 */
export async function queueCodingBackgroundTask(params: {
  projectId: string;
  projectName: string;
  projectPath: string;
  taskId: string;
  title: string;
  description: string;
  impactedFiles: unknown;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/kiro/background-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: params.projectId,
        projectName: params.projectName,
        projectPath: params.projectPath,
        taskType: 'coding_task',
        priority: 1,
        taskData: {
          taskId: params.taskId,
          title: params.title,
          description: params.description,
          impactedFiles: params.impactedFiles
        }
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error queuing coding task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
