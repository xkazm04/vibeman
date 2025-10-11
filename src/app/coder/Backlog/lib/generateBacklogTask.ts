import { backlogDb } from '@/lib/backlogDatabase';
import { ollamaClient } from '@/lib/ollama';
import { v4 as uuidv4 } from 'uuid';
import { 
  GenerateBacklogTaskParams, 
  BacklogTaskResponse,
  TaskData 
} from './backlogTypes';
import { buildContextSection, buildFilesSection, buildExistingTasksSection } from './promptBuilder';
import { generateBacklogTaskPrompt } from '../prompts/backlogTaskPrompt';
import { validateTaskData } from './backlogUtils';

export type { GenerateBacklogTaskParams };



// Generate backlog task using LLM
export async function generateBacklogTask(params: GenerateBacklogTaskParams): Promise<BacklogTaskResponse> {
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

    // Build prompt sections using helpers
    const existingTasksSection = buildExistingTasksSection(existingTasks);
    
    let contextSection = '';
    let filesSection = '';

    if (mode === 'context') {
      contextSection = await buildContextSection(selectedContexts, projectPath);
    } else {
      filesSection = await buildFilesSection(selectedFilePaths, projectPath);
    }

    const prompt = generateBacklogTaskPrompt({
      taskRequest,
      projectName,
      mode,
      existingTasksSection,
      contextSection,
      filesSection
    });

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

    // Parse the JSON response
    const parseResult = ollamaClient.parseJsonResponse(response);
    if (!parseResult.success || !parseResult.data) {
      console.error('Failed to parse LLM response as JSON:', parseResult.error);
      console.log('Raw response:', response);
      throw new Error(parseResult.error || 'Failed to parse LLM response as valid JSON');
    }

    const taskData = parseResult.data as TaskData;
    console.log('Successfully parsed task data:', taskData);

    // Validate required fields
    if (!validateTaskData(taskData)) {
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