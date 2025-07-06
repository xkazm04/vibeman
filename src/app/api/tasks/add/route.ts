import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

interface TaskRequest {
  title: string;
  description: string;
  type?: string;
  priority?: string;
  location?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { title, description, type = 'Feature', priority = 'Medium', location }: TaskRequest = await request.json();
    
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const tasksPath = path.join(process.cwd(), 'TASKS.md');
    
    // Read existing TASKS.md
    let tasksContent = '';
    try {
      tasksContent = await readFile(tasksPath, 'utf-8');
    } catch {
      // If file doesn't exist, create basic structure
      tasksContent = `# Background Agent Tasks

## Pending Tasks

## Completed Tasks

(Tasks will be moved here when completed)

## Instructions for Background Agent

1. Read this TASKS.md file
2. Pick the first pending task
3. Create a new branch with the specified name
4. Implement the task according to the requirements
5. Test the implementation
6. Create a pull request
7. Move the task to "Completed Tasks" section with completion date
`;
    }

    // Generate task entry
    const taskId = Date.now();
    const branchName = `feature/${title.toLowerCase().replace(/\s+/g, '-')}`;
    
    const newTask = `
### Task ${taskId}: ${title}
- **Priority**: ${priority}
- **Type**: ${type}
- **Description**: ${description}
- **Location**: ${location || 'To be determined'}
- **Requirements**:
  - Follow existing project patterns
  - Use TypeScript for all new code
  - Apply appropriate styling
  - Test the implementation
- **Branch**: \`${branchName}\`
- **Status**: Pending
`;

    // Insert new task after "## Pending Tasks"
    const pendingTasksIndex = tasksContent.indexOf('## Pending Tasks');
    if (pendingTasksIndex !== -1) {
      const insertIndex = tasksContent.indexOf('\n', pendingTasksIndex) + 1;
      tasksContent = tasksContent.slice(0, insertIndex) + newTask + tasksContent.slice(insertIndex);
    } else {
      // Fallback: append to end
      tasksContent += newTask;
    }

    // Write updated TASKS.md
    await writeFile(tasksPath, tasksContent);

    return NextResponse.json({ 
      success: true, 
      taskId, 
      message: 'Task added to TASKS.md successfully',
      branchName
    });

  } catch (error) {
    console.error('Error adding task:', error);
    return NextResponse.json({ error: 'Failed to add task' }, { status: 500 });
  }
} 