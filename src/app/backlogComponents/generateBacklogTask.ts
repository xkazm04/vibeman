import { readFile } from 'fs/promises';
import { join } from 'path';
import { backlogDb } from '../../../lib/backlogDatabase';
import { v4 as uuidv4 } from 'uuid';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'gpt-oss:20b';

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

async function callOllamaAPI(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result.response;
  } catch (error) {
    console.error('Failed to call Ollama API:', error);
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

    const prompt = `You are an expert software developer and project manager. Your task is to analyze the provided code and create a detailed backlog item based on the user's request.

## User Request
"${taskRequest}"

## Project Information
**Project Name**: ${projectName}
**Mode**: ${mode === 'context' ? 'Context-based analysis' : 'Individual file analysis'}

${existingTasksSection}

${contextSection}
${filesSection}

## Instructions

Based on the user request and the provided code/context, create a detailed backlog item that includes:

1. **Title**: A clear, concise title (2-6 words)
2. **Description**: A comprehensive description of what needs to be done
3. **Implementation Steps**: Detailed, actionable steps for implementation
4. **Type**: Either "feature" or "optimization"
5. **Impacted Files**: List of files that will be modified or created

**CRITICAL REQUIREMENTS:**
- DO NOT duplicate any existing tasks listed above
- Provide specific, actionable implementation steps
- Consider the existing code structure and patterns
- Ensure the task is feasible and well-scoped
- Focus on the user's specific request

Return your response in this exact JSON format:

\`\`\`json
{
  "title": "Clear task title",
  "description": "Detailed description of the task and its purpose",
  "steps": [
    "Step 1: Specific action to take",
    "Step 2: Another specific action",
    "Step 3: Additional steps as needed"
  ],
  "type": "feature",
  "impactedFiles": [
    {
      "filepath": "path/to/file.tsx",
      "type": "update"
    },
    {
      "filepath": "path/to/new/file.tsx", 
      "type": "create"
    }
  ]
}
\`\`\`

Ensure the JSON is valid and parseable. Focus on creating a task that directly addresses the user's request while being implementable with the provided code context.`;

    console.log('Calling Ollama API for backlog task generation...');
    const response = await callOllamaAPI(prompt);
    console.log(`Received response from Ollama (${response.length} characters)`);

    // Parse the JSON response
    let taskData;
    try {
      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response;
      
      taskData = JSON.parse(jsonString.trim());
      console.log('Successfully parsed task data:', taskData);
    } catch (parseError) {
      console.error('Failed to parse LLM response as JSON:', parseError);
      console.log('Raw response:', response);
      throw new Error('Failed to parse LLM response as valid JSON');
    }

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