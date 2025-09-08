import { backlogDb } from '@/lib/backlogDatabase';
import { ollamaClient } from '@/lib/ollama';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

interface Context {
  id: string;
  name: string;
  description?: string;
  filePaths: string[];
  contextFilePath?: string;
}

interface GenerateBacklogTaskParams {
  projectId: string;
  projectName: string;
  projectPath: string;
  taskRequest: string;
  mode: 'context' | 'individual';
  selectedContexts: Context[];
  selectedFilePaths: string[];
}



// Read file content safely
async function readFileContent(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.warn(`Could not read file ${filePath}:`, error);
    return `[Could not read file: ${filePath}]`;
  }
}

// Read context file content
async function readContextFile(contextFilePath: string, projectPath: string): Promise<string> {
  try {
    const fullPath = join(projectPath, contextFilePath);
    const content = await readFile(fullPath, 'utf-8');
    return content;
  } catch (error) {
    console.warn(`Could not read context file ${contextFilePath}:`, error);
    return `[Context file not found: ${contextFilePath}]`;
  }
}

// Generate backlog task using LLM
export async function generateBacklogTask(params: GenerateBacklogTaskParams): Promise<{
  success: boolean;
  taskId?: string;
  error?: string;
}> {
  try {
    const {
      projectId,
      projectName,
      projectPath,
      taskRequest,
      mode,
      selectedContexts,
      selectedFilePaths
    } = params;

    console.log(`Starting backlog task generation for: ${taskRequest}`);

    // Get existing tasks to prevent duplicates
    const existingTasks = backlogDb.getBacklogItemsByProject(projectId);

    // Build the prompt based on mode
    let filesSection = '';
    let contextSection = '';

    if (mode === 'context') {
      // Context mode: use selected contexts
      contextSection = '## Selected Context Files\n\n';
      
      for (const context of selectedContexts) {
        contextSection += `### Context: ${context.name}\n`;
        contextSection += `**Description**: ${context.description || 'No description'}\n`;
        contextSection += `**Related Files**: ${context.filePaths.join(', ')}\n\n`;
        
        // Read context file if available
        if (context.contextFilePath) {
          const contextContent = await readContextFile(context.contextFilePath, projectPath);
          contextSection += `**Context Documentation**:\n\`\`\`markdown\n${contextContent.slice(0, 3000)}\n\`\`\`\n\n`;
        }
        
        // Read related files (first 3 files to avoid overwhelming the prompt)
        const filesToRead = context.filePaths.slice(0, 3);
        for (const filePath of filesToRead) {
          const fullPath = join(projectPath, filePath);
          const fileContent = await readFileContent(fullPath);
          contextSection += `**File: ${filePath}**\n\`\`\`\n${fileContent.slice(0, 2000)}\n\`\`\`\n\n`;
        }
      }
    } else {
      // Individual mode: use selected files
      filesSection = '## Selected Files\n\n';
      
      for (const filePath of selectedFilePaths) {
        const fullPath = join(projectPath, filePath);
        const fileContent = await readFileContent(fullPath);
        filesSection += `### File: ${filePath}\n\`\`\`\n${fileContent.slice(0, 2500)}\n\`\`\`\n\n`;
      }
    }

    // Build existing tasks section
    const existingTasksSection = existingTasks.length > 0 ? 
      `## Existing Tasks (DO NOT DUPLICATE)\n\n${existingTasks.map((task, index) => 
        `${index + 1}. **${task.title}** (${task.type}, ${task.status})\n   - ${task.description}\n`
      ).join('\n')}\n\n` : 
      '## Existing Tasks\n\nNo existing tasks.\n\n';

    const prompt = `You are a senior software architect and technical lead with deep expertise in modern web development, system design, and project management. Your role is to analyze codebases with precision and create comprehensive, actionable backlog items that reflect industry best practices.

## Analysis Context

**User Request**: "${taskRequest}"
**Project**: ${projectName}
**Analysis Mode**: ${mode === 'context' ? 'Context-based analysis' : 'Individual file analysis'}

${existingTasksSection}

${contextSection}
${filesSection}

## Your Task

Analyze the provided codebase and user request with the same depth and precision as a senior developer conducting a code review. Create a backlog item that demonstrates:

1. **Deep Technical Understanding**: Show you understand the existing architecture, patterns, and dependencies
2. **Strategic Thinking**: Consider how this change fits into the broader system design
3. **Implementation Expertise**: Provide steps that reflect real-world development practices
4. **Quality Focus**: Ensure the task promotes maintainable, scalable, and robust code

## Analysis Framework

**Code Architecture Analysis:**
- Identify existing patterns, conventions, and architectural decisions
- Understand component relationships and data flow
- Recognize potential integration points and dependencies
- Assess impact on system performance and maintainability

**Implementation Strategy:**
- Break down complex requirements into logical, sequential steps
- Consider error handling, edge cases, and user experience
- Plan for testing, validation, and potential rollback scenarios
- Identify opportunities for code reuse and optimization

**Quality Assurance:**
- Ensure type safety and proper error boundaries
- Consider accessibility, performance, and security implications
- Plan for proper documentation and code comments
- Think about future extensibility and maintenance

## Output Requirements

Generate a backlog item that a senior developer would create - detailed, technically sound, and immediately actionable. The task should be scoped appropriately (not too broad, not too narrow) and include all necessary technical considerations.

**CRITICAL CONSTRAINTS:**
- DO NOT duplicate existing tasks listed above
- Provide implementation steps that reflect real development workflow
- Consider the existing codebase patterns and maintain consistency
- Ensure the task is technically feasible with the current architecture
- Focus precisely on the user's request without scope creep

**Response Format** (JSON only, no additional text):

\`\`\`json
{
  "title": "Concise, technical title (2-6 words)",
  "description": "Comprehensive description that explains the technical requirements, business value, and implementation approach. Include specific details about how this integrates with existing systems.",
  "steps": [
    "Step 1: Specific technical action with implementation details",
    "Step 2: Next logical step in the development workflow",
    "Step 3: Additional steps covering testing, validation, and integration",
    "Step N: Final steps including documentation and cleanup"
  ],
  "type": "feature",
  "impactedFiles": [
    {
      "filepath": "path/to/existing/file.tsx",
      "type": "update"
    },
    {
      "filepath": "path/to/new/component.tsx", 
      "type": "create"
    }
  ]
}
\`\`\`

Analyze the codebase with the same rigor and attention to detail that you would apply to any complex software system. Create a task that demonstrates deep technical understanding and provides clear, actionable guidance for implementation.`;

    console.log('Calling Ollama API for backlog task generation...');
    const ollamaResponse = await ollamaClient.generate({
      prompt,
      projectId,
      taskType: 'backlog_task_generation',
      taskDescription: `Generate backlog task: ${taskRequest}`
    });

    if (!ollamaResponse.success || !ollamaResponse.response) {
      throw new Error(ollamaResponse.error || 'Failed to generate task');
    }

    const response = ollamaResponse.response;
    console.log(`Received response from Ollama (${response.length} characters)`);

    // Parse the JSON response using the universal helper
    const parseResult = ollamaClient.parseJsonResponse(response);
    if (!parseResult.success || !parseResult.data) {
      console.error('Failed to parse LLM response as JSON:', parseResult.error);
      console.log('Raw response:', response);
      throw new Error(parseResult.error || 'Failed to parse LLM response as valid JSON');
    }

    const taskData = parseResult.data;
    console.log('Successfully parsed task data:', taskData);

    // Validate required fields
    if (!taskData.title || !taskData.description || !taskData.steps || !taskData.type) {
      throw new Error('Generated task is missing required fields');
    }

    // Create the backlog item in database
    const taskId = uuidv4();
    const dbTask = backlogDb.createBacklogItem({
      id: taskId,
      project_id: projectId,
      title: taskData.title,
      description: taskData.description,
      steps: taskData.steps,
      status: 'pending',
      type: taskData.type === 'feature' ? 'feature' : 'optimization',
      impacted_files: taskData.impactedFiles || []
    });

    console.log(`Successfully created backlog task: ${dbTask.id}`);

    return {
      success: true,
      taskId: dbTask.id
    };

  } catch (error) {
    console.error('Failed to generate backlog task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}