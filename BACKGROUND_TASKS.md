# Background Task Queue System

This document explains the new background task queue system that replaces direct async processing for AI-generated content.

## Overview

The background task system provides:
- **Queued Processing**: Tasks are queued and processed sequentially to prevent resource conflicts
- **Task Management**: View, cancel, retry, and monitor task progress
- **Error Handling**: Failed tasks can be retried with configurable retry limits
- **Real-time Updates**: Live updates of task status and progress
- **Persistent Storage**: Tasks are stored in SQLite database and survive app restarts

## Architecture

### Components

1. **Database Layer** (`backgroundTaskDatabase.ts`)
   - SQLite database for task persistence
   - Task CRUD operations
   - Queue settings management

2. **Queue Manager** (`backgroundTaskQueue.ts`)
   - Singleton task processor
   - Automatic task polling and execution
   - Error handling and retry logic

3. **API Layer** (`/api/kiro/background-tasks/route.ts`)
   - REST API for task management
   - Create, update, delete, and query tasks

4. **React Components**
   - `BackgroundTaskLayout`: Main container component
   - `BackgroundTaskManager`: Task management interface
   - `BackgroundTaskTable`: Task list display
   - `BackgroundTaskRow`: Individual task display

5. **React Hook** (`useBackgroundTasks.ts`)
   - React hook for task state management
   - Auto-refresh capabilities
   - Task action methods

## Usage

### Creating Background Tasks

Instead of calling AI APIs directly, create background tasks:

```typescript
// Old way (direct async processing)
const response = await fetch('/api/kiro/ai-project-review', {
  method: 'POST',
  body: JSON.stringify({ mode: 'docs', projectId, projectPath, projectName })
});

// New way (background task)
const response = await fetch('/api/kiro/background-tasks', {
  method: 'POST',
  body: JSON.stringify({
    projectId,
    projectPath,
    projectName,
    taskType: 'docs',
    priority: 1
  })
});
```

### Task Types

Supported task types:
- `docs`: Generate AI documentation
- `tasks`: Generate task recommendations
- `goals`: Generate project goals
- `context`: Generate context files
- `code`: Generate code optimization tasks

### Task States

- `pending`: Task is queued and waiting to be processed
- `processing`: Task is currently being executed
- `completed`: Task finished successfully
- `error`: Task failed (can be retried)
- `cancelled`: Task was cancelled by user

### Using the React Hook

```typescript
import { useBackgroundTasks } from '../hooks/useBackgroundTasks';

function MyComponent() {
  const {
    tasks,
    taskCounts,
    isLoading,
    error,
    createTask,
    cancelTask,
    retryTask,
    clearCompleted
  } = useBackgroundTasks({ 
    autoRefresh: true, 
    refreshInterval: 3000 
  });

  const handleCreateTask = async () => {
    try {
      await createTask({
        projectId: 'my-project',
        projectName: 'My Project',
        projectPath: '/path/to/project',
        taskType: 'docs',
        priority: 1
      });
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  return (
    <div>
      <button onClick={handleCreateTask}>Generate Docs</button>
      <div>Pending tasks: {taskCounts.pending}</div>
      {/* Display tasks */}
    </div>
  );
}
```

### Queue Management

The queue can be started/stopped via API calls:

```typescript
// Start processing tasks
const response = await fetch('/api/kiro/background-tasks/queue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'start' })
});

// Stop processing tasks
const response = await fetch('/api/kiro/background-tasks/queue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'stop' })
});

// Check queue status
const response = await fetch('/api/kiro/background-tasks/queue');
const result = await response.json();
const isActive = result.queueSettings?.isActive;
```

## Integration with Existing Code

### AIProjectReviewModal Updates

The `AIProjectReviewModal` has been updated to use background tasks:

```typescript
const handleBackgroundGeneration = async (mode: 'docs' | 'tasks' | 'goals' | 'context' | 'code') => {
  if (!activeProject) return;

  try {
    const response = await fetch('/api/kiro/background-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: activeProject.id,
        projectPath: activeProject.path,
        projectName: activeProject.name,
        taskType: mode,
        priority: 1
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log(`Background ${mode} task queued:`, result.task);
      handleClose();
    }
  } catch (error) {
    console.error(`Failed to queue background ${mode} task:`, error);
  }
};
```

### Layout Integration

Use the `CombinedBottomLayout` component to show both Events and Background Tasks:

```typescript
import CombinedBottomLayout from '../combined-layout/CombinedBottomLayout';

export default function MyPage() {
  return (
    <div className="min-h-screen">
      {/* Your main content */}
      <div className="pb-32"> {/* Add padding for fixed bottom panels */}
        {/* Main content here */}
      </div>
      
      {/* Combined Events and Background Tasks */}
      <CombinedBottomLayout />
    </div>
  );
}
```

## Database Schema

### background_tasks table

```sql
CREATE TABLE background_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_path TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('docs', 'tasks', 'goals', 'context', 'code')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'error', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  result_data TEXT, -- JSON string
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);
```

### task_queue_settings table

```sql
CREATE TABLE task_queue_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  is_active INTEGER NOT NULL DEFAULT 0,
  poll_interval INTEGER NOT NULL DEFAULT 5000,
  max_concurrent_tasks INTEGER NOT NULL DEFAULT 1,
  last_poll_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## API Endpoints

### GET /api/kiro/background-tasks
Get tasks with optional filtering:
- `?projectId=<id>` - Filter by project
- `?status=<status>` - Filter by status
- `?limit=<number>` - Limit results

### POST /api/kiro/background-tasks
Create a new background task:
```json
{
  "projectId": "string",
  "projectName": "string", 
  "projectPath": "string",
  "taskType": "docs|tasks|goals|context|code",
  "priority": 0,
  "maxRetries": 3
}
```

### PUT /api/kiro/background-tasks
Update task status:
```json
{
  "taskId": "string",
  "status": "pending|processing|completed|error|cancelled",
  "errorMessage": "string",
  "resultData": {}
}
```

### DELETE /api/kiro/background-tasks
Task actions:
- `?taskId=<id>&action=cancel` - Cancel task
- `?taskId=<id>&action=retry` - Retry failed task
- `?taskId=<id>&action=delete` - Delete task
- `?action=clear-completed` - Clear all completed tasks

## Best Practices

1. **Task Priority**: Use higher priority (1-10) for user-initiated tasks
2. **Error Handling**: Always handle task creation errors gracefully
3. **UI Feedback**: Show task status in UI to keep users informed
4. **Resource Management**: Queue automatically stops when no tasks remain
5. **Cleanup**: Regularly clear completed tasks to keep database size manageable

## Migration from Direct Processing

To migrate existing direct async processing:

1. Replace direct API calls with background task creation
2. Remove loading states from immediate UI (tasks run in background)
3. Add task status monitoring if needed
4. Update user feedback to indicate task was queued
5. Use the combined layout to show task progress

## Troubleshooting

### Common Issues

1. **Tasks not processing**: Check if queue is started
2. **Database errors**: Ensure database directory exists and is writable
3. **API errors**: Check network connectivity and API endpoint availability
4. **Memory issues**: Clear completed tasks regularly

### Debugging

Enable debug logging:
```typescript
// In backgroundTaskQueue.ts, add more console.log statements
console.log('Processing task:', task.id, task.task_type);
```

Check database directly:
```sql
-- View all tasks
SELECT * FROM background_tasks ORDER BY created_at DESC;

-- View queue settings
SELECT * FROM task_queue_settings;

-- Count tasks by status
SELECT status, COUNT(*) FROM background_tasks GROUP BY status;
```