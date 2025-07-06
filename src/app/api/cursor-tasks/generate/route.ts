import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';

interface TaskRequest {
  title: string;
  description: string;
  type?: string;
  priority?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { title, description, type = 'feature', priority = 'medium' }: TaskRequest = await request.json();
    
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const taskId = `task-${Date.now()}`;
    const taskDir = path.join(process.cwd(), 'cursor-tasks');
    
    // Ensure cursor-tasks directory exists
    try {
      await mkdir(taskDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate task content
    const taskContent = `# Task: ${title}
## ID: ${taskId}
## Type: ${type}
## Priority: ${priority}
## Created: ${new Date().toISOString()}

## Description
${description}

## Acceptance Criteria
- [ ] Task should be implemented according to description
- [ ] Code should follow project conventions
- [ ] Implementation should be tested

## Technical Implementation Details
Follow the existing project structure and patterns. Use TypeScript for all new code.

## Cursor Agent Instructions
Please implement this ${type} following these steps:
1. Analyze the existing codebase structure
2. Create necessary files following project conventions
3. Implement the feature/fix with proper error handling
4. Add appropriate tests if applicable
5. Update documentation as needed
6. Ensure all acceptance criteria are met

## Estimated Complexity: medium
## Branch Name: ${type}/${taskId}-${title.toLowerCase().replace(/\s+/g, '-')}

---
END OF TASK DEFINITION
`;

    // Write task file
    const taskPath = path.join(taskDir, `${taskId}.md`);
    await writeFile(taskPath, taskContent);

    // Create or update manifest
    const manifestPath = path.join(taskDir, '_manifest.json');
    let manifest;
    
    try {
      const existingManifestData = await readFile(manifestPath, 'utf-8');
      manifest = JSON.parse(existingManifestData);
    } catch {
      manifest = {
        generated: new Date().toISOString(),
        tasks: [],
        totalTasks: 0
      };
    }

    // Add new task to manifest
    manifest.tasks.push({
      id: taskId,
      file: `${taskId}.md`,
      status: 'pending',
      title,
      type,
      priority,
      created: new Date().toISOString()
    });
    manifest.totalTasks = manifest.tasks.length;
    manifest.lastUpdated = new Date().toISOString();

    // Write manifest
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return NextResponse.json({ 
      success: true, 
      taskId, 
      message: 'Task generated successfully',
      taskPath: `cursor-tasks/${taskId}.md`
    });

  } catch (error) {
    console.error('Error generating task:', error);
    return NextResponse.json({ error: 'Failed to generate task' }, { status: 500 });
  }
} 